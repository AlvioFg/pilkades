package id.dayeuhkolot.pilkades.simulasi;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.BluetoothSocket;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Cetak ESC/POS ke printer thermal Bluetooth.
 *
 * Strategi koneksi (diurut dari yang paling umum ke paling Consulte):
 *  1. RFCOMM dengan UUID SPP standar (00001101-...-9B34FB)
 *  2. RFCOMM dengan UUID lain yang di-advertise printer
 *  3. RFCOMM "insecure" (tanpa pairing, dipakai beberapa printer murah)
 *  4. RFCOMM kanal mentah 1..5 (createRfcommSocket)
 *  5. BLE / GATT - printer thermal baru (mis. Zjiang, Rongta, Xprinter)
 *
 * Semua kegagalan dikumpulkan sebagai diagnostics agar penyebabnya terlihat
 * di aplikasi, bukan sekadar "gagal".
 */
@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN },
            alias = BluetoothPrinterPlugin.PERM_BLUETOOTH
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    static final String PERM_BLUETOOTH = "bluetooth";

    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    /** UUID yang sering dipakai printer thermal vendor. */
    private static final UUID[] COMMON_UUIDS = new UUID[] {
        SPP_UUID,
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("0000FFE0-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("0000FFE1-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("0000FFE5-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("000018F0-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("0000FEE7-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("49535343-FE7D-4AE5-8FA9-9FAFD205E455"),
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"),
    };

    /** UUID service/characteristic yang umum dipakai printer BLE. */
    private static final UUID[] BLE_SERVICES = new UUID[] {
        UUID.fromString("000018F0-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("0000FFE0-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("0000FEE7-0000-1000-8000-00805F9B34FB"),
        UUID.fromString("000018F0-0000-1000-8000-00805F9B34FB"),
    };

    private static final UUID BLE_WRITE_CHAR = UUID.fromString("0000FFE1-0000-1000-8000-00805F9B34FB");
    private static final UUID BLE_WRITE_CHAR_2 = UUID.fromString("0000FFE2-0000-1000-8000-00805F9B34FB");
    private static final UUID BLE_WRITE_CHAR_3 = UUID.fromString("0000FF02-0000-1000-8000-00805F9B34FB");
    private static final UUID CLIENT_CHARACTERISTIC_CONFIG = UUID.fromString("00002902-0000-1000-8000-00805F9B34FB");

    private BluetoothSocket socket;
    private BluetoothGatt gatt;
    private BluetoothGattCharacteristic gattCharacteristic;
    private String connectedAddress;
    private String connectedName;
    private String lastError;
    private String lastDiagnostics = "";

    private boolean hasConnectPermission() {
        return getPermissionState(PERM_BLUETOOTH) == PermissionState.GRANTED;
    }

    private BluetoothAdapter getAdapter() {
        return BluetoothAdapter.getDefaultAdapter();
    }

    private void disconnectQuiet() {
        if (gatt != null) {
            try {
                gatt.disconnect();
                gatt.close();
            } catch (Exception ignored) {
            }
            gatt = null;
            gattCharacteristic = null;
        }
        if (socket != null) {
            try {
                socket.close();
            } catch (IOException ignored) {
            }
        }
        socket = null;
        connectedAddress = null;
        connectedName = null;
    }

    private JSObject statusObject() {
        JSObject ret = new JSObject();
        boolean connected = (socket != null && socket.isConnected())
            || (gatt != null && gattCharacteristic != null);
        ret.put("connected", connected);
        ret.put("address", connected ? connectedAddress : null);
        ret.put("name", connected ? connectedName : null);
        ret.put("lastError", lastError);
        ret.put("diagnostics", lastDiagnostics);
        ret.put("platform", "android");
        return ret;
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasConnectPermission());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (hasConnectPermission()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias(PERM_BLUETOOTH, call, "permissionsCallback");
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasConnectPermission());
        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(statusObject());
    }

    /**
     * Daftar perangkat yang sudah dipasangkan (bonded) di Setelan Android.
     */
    @PluginMethod
    public void listPaired(PluginCall call) {
        if (!hasConnectPermission()) {
            call.reject("Izin Bluetooth belum diberikan.");
            return;
        }

        BluetoothAdapter adapter = getAdapter();
        if (adapter == null) {
            call.reject("Bluetooth tidak tersedia di perangkat ini.");
            return;
        }

        try {
            Set<BluetoothDevice> paired = adapter.getBondedDevices();
            JSArray devices = new JSArray();
            if (paired != null) {
                for (BluetoothDevice device : paired) {
                    JSObject item = new JSObject();
                    item.put("name", device.getName() != null ? device.getName() : "Perangkat");
                    item.put("address", device.getAddress());
                    item.put("type", device.getType() == BluetoothDevice.DEVICE_TYPE_LE ? "ble" : "classic");
                    devices.put(item);
                }
            }
            JSObject ret = new JSObject();
            ret.put("devices", devices);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Tidak bisa membaca perangkat Bluetooth: " + e.getMessage());
        }
    }

    /**
     * Scan BLE singkat untuk mencari printer yang hanyaPAIR via BLE
     * (tidak muncul sebagai bonded device).
     */
    @PluginMethod
    public void scanForPrinters(PluginCall call) {
        if (!hasConnectPermission()) {
            call.save();
            requestPermissionForAlias(PERM_BLUETOOTH, call, "scanPermissionCallback");
            return;
        }
        doScanForPrinters(call);
    }

    @PermissionCallback
    private void scanPermissionCallback(PluginCall call) {
        if (!hasConnectPermission()) {
            call.reject("Izin Bluetooth ditolak.");
            return;
        }
        doScanForPrinters(call);
    }

    private void doScanForPrinters(PluginCall call) {
        BluetoothAdapter adapter = getAdapter();
        if (adapter == null) {
            call.reject("Bluetooth tidak tersedia.");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth dimatikan. Nyalakan Bluetooth di Setelan Android.");
            return;
        }
        if (!hasBleSupport()) {
            JSObject ret = new JSObject();
            ret.put("devices", new JSArray());
            ret.put("supported", false);
            call.resolve(ret);
            return;
        }

        final JSArray found = new JSArray();
        final Set<String> seen = new LinkedHashSet<>();

        ScanCallback callback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                BluetoothDevice device = result.getDevice();
                String address = device.getAddress();
                if (address == null || !seen.add(address)) {
                    return;
                }
                JSObject item = new JSObject();
                item.put("name", device.getName() != null ? device.getName() : "Perangkat");
                item.put("address", address);
                item.put("type", "ble");
                found.put(item);
            }
        };

        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build();

        List<android.bluetooth.le.ScanFilter> filters = new ArrayList<>();
        for (UUID uuid : BLE_SERVICES) {
            filters.add(new android.bluetooth.le.ScanFilter.Builder().setServiceUuid(new ParcelUuid(uuid)).build());
        }

        try {
            adapter.getBluetoothLeScanner().startScan(filters, settings, callback);
        } catch (Exception e) {
            try {
                adapter.getBluetoothLeScanner().startScan(null, settings, callback);
            } catch (Exception e2) {
                call.reject("Gagal menjalankan scan BLE: " + e2.getMessage());
                return;
            }
        }

        // Scan 6 detik, lalu kembalikan hasil.
        bridge.getActivity().runOnUiThread(() -> {
            new Thread(() -> {
                try {
                    Thread.sleep(6000);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
                try {
                    adapter.getBluetoothLeScanner().stopScan(callback);
                } catch (Exception ignored) {
                }
                JSObject ret = new JSObject();
                ret.put("devices", found);
                ret.put("supported", true);
                call.resolve(ret);
            }).start();
        });
    }

    private boolean hasBleSupport() {
        BluetoothAdapter adapter = getAdapter();
        return adapter != null && adapter.isEnabled() && adapter.getBluetoothLeScanner() != null;
    }

    /**
     * Auto-connect: mencoba SEMUA perangkat yang paired, satu per satu,
     * dengan semua strategi (RFCOMM multi-UUID, insecure, kanal raw, BLE).
     */
    @PluginMethod
    public void connectFirstPairedPrinter(PluginCall call) {
        if (!hasConnectPermission()) {
            call.save();
            requestPermissionForAlias(PERM_BLUETOOTH, call, "autoConnectPermissionCallback");
            return;
        }
        doConnectFirstPairedPrinter(call);
    }

    @PermissionCallback
    private void autoConnectPermissionCallback(PluginCall call) {
        if (!hasConnectPermission()) {
            call.reject("Izin Bluetooth ditolak.");
            return;
        }
        doConnectFirstPairedPrinter(call);
    }

    private void doConnectFirstPairedPrinter(PluginCall call) {
        new Thread(() -> {
            BluetoothAdapter adapter = getAdapter();
            if (adapter == null) {
                call.reject("Bluetooth tidak tersedia.");
                return;
            }
            if (!adapter.isEnabled()) {
                call.reject("Bluetooth sedang dimatikan. Nyalakan dulu di Setelan Android.");
                return;
            }

            StringBuilder log = new StringBuilder();
            Set<BluetoothDevice> bonded;
            try {
                bonded = adapter.getBondedDevices();
            } catch (SecurityException e) {
                call.reject("Izin Bluetooth ditolak oleh sistem: " + e.getMessage());
                return;
            }

            if (bonded == null || bonded.isEmpty()) {
                lastDiagnostics = "Tidak ada perangkat yang dipasangkan (bonded) di Setelan Android.";
                call.reject(lastDiagnostics);
                return;
            }

            List<BluetoothDevice> candidates = new ArrayList<>(bonded);

            // Coba BLE scan bila perangkat bonded sedikit (printer BLE
            // kadang tidak muncul sebagai bonded device).
            if (hasBleSupport()) {
                for (BluetoothDevice device : scanBleDevices(4000)) {
                    boolean exists = false;
                    for (BluetoothDevice b : candidates) {
                        if (b.getAddress().equals(device.getAddress())) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        candidates.add(device);
                    }
                }
            }

            for (BluetoothDevice device : candidates) {
                String name = device.getName() == null ? "Perangkat" : device.getName();
                log.append("[").append(name).append("] ");

                try {
                    disconnectQuiet();
                    BluetoothSocket connected = connectToDevice(device, log);
                    socket = connected;
                    connectedAddress = device.getAddress();
                    connectedName = name;
                    lastError = null;
                    lastDiagnostics = log.toString();

                    JSObject ret = new JSObject();
                    ret.put("connected", true);
                    ret.put("address", connectedAddress);
                    ret.put("name", connectedName);
                    ret.put("diagnostics", lastDiagnostics);
                    call.resolve(ret);
                    return;
                } catch (Exception connectError) {
                    log.append("RFCOMM gagal (").append(shortMessage(connectError)).append(") ");
                }

                try {
                    disconnectQuiet();
                    BluetoothGatt connectedGatt = connectBleDevice(device, log);
                    gatt = connectedGatt;
                    connectedAddress = device.getAddress();
                    connectedName = name;
                    lastError = null;
                    lastDiagnostics = log.toString();

                    JSObject ret = new JSObject();
                    ret.put("connected", true);
                    ret.put("address", connectedAddress);
                    ret.put("name", connectedName);
                    ret.put("transport", "ble");
                    ret.put("diagnostics", lastDiagnostics);
                    call.resolve(ret);
                    return;
                } catch (Exception bleError) {
                    log.append("BLE gagal (").append(shortMessage(bleError)).append(") ");
                }
            }

            lastDiagnostics = log.toString();
            call.reject(
                "Tidak ada perangkat yang menerima koneksi cetak. Rincian: " + lastDiagnostics
                    + " Catatan: sebagian printer thermal hanya menerima koneksi dari aplikasi resmi vendor atau Bluetooth Classic (SPP).");
        }).start();
    }

    private String shortMessage(Exception e) {
        String msg = e.getMessage();
        if (msg == null || msg.isEmpty()) {
            return e.getClass().getSimpleName();
        }
        return msg.length() > 80 ? msg.substring(0, 80) : msg;
    }

    private List<BluetoothDevice> scanBleDevices(long millis) {
        List<BluetoothDevice> result = new ArrayList<>();
        BluetoothAdapter adapter = getAdapter();
        if (adapter == null || !hasBleSupport()) {
            return result;
        }
        final Object lock = new Object();
        final List<BluetoothDevice> collected = new ArrayList<>();

        ScanCallback callback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult scanResult) {
                synchronized (lock) {
                    collected.add(scanResult.getDevice());
                }
            }
        };

        try {
            adapter.getBluetoothLeScanner().startScan(null, new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build(), callback);
        } catch (Exception e) {
            return result;
        }

        try {
            Thread.sleep(millis);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }

        try {
            adapter.getBluetoothLeScanner().stopScan(callback);
        } catch (Exception ignored) {
        }

        synchronized (lock) {
            for (BluetoothDevice device : collected) {
                boolean exists = false;
                for (BluetoothDevice known : result) {
                    if (known.getAddress().equals(device.getAddress())) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    result.add(device);
                }
            }
        }
        return result;
    }

    /**
     * Multi-strategi koneksi RFCOMM (Bluetooth Classic).
     */
    private BluetoothSocket connectToDevice(BluetoothDevice device, StringBuilder log) throws IOException {
        BluetoothAdapter adapter = getAdapter();
        if (adapter != null) {
            adapter.cancelDiscovery();
        }

        IOException last = null;

        // 1) UUID SPP standar
        try {
            BluetoothSocket s = device.createRfcommSocketToServiceRecord(SPP_UUID);
            s.connect();
            log.append("SPP-UUID OK. ");
            return s;
        } catch (IOException e) {
            last = e;
            log.append("SPP-UUID gagal; ");
        }

        // 2) UUID lain yang umum
        for (UUID uuid : COMMON_UUIDS) {
            if (uuid.equals(SPP_UUID)) {
                continue;
            }
            try {
                BluetoothSocket s = device.createRfcommSocketToServiceRecord(uuid);
                s.connect();
                log.append("UUID ").append(uuid).append(" OK. ");
                return s;
            } catch (IOException e) {
                last = e;
            }
        }
        log.append("UUID lain gagal; ");

        // 3) Insecure socket (printer yang tidak butuh pairing)
        try {
            Method createInsecure = device.getClass()
                .getMethod("createInsecureRfcommSocketToServiceRecord", UUID.class);
            BluetoothSocket s = (BluetoothSocket) createInsecure.invoke(device, SPP_UUID);
            s.connect();
            log.append("insecure OK. ");
            return s;
        } catch (Exception e) {
            if (e instanceof IOException) {
                last = (IOException) e;
            }
        }

        // 4) Kanal RFCOMM mentah
        for (int channel = 1; channel <= 5; channel++) {
            try {
                Method createRfcomm = device.getClass().getMethod("createRfcommSocket", int.class);
                BluetoothSocket s = (BluetoothSocket) createRfcomm.invoke(device, channel);
                s.connect();
                log.append("kanal ").append(channel).append(" OK. ");
                return s;
            } catch (Exception e) {
                if (e.getCause() instanceof IOException) {
                    last = (IOException) e.getCause();
                }
            }
        }

        if (last != null) {
            throw last;
        }
        throw new IOException("Gagal membuka koneksi Bluetooth ke printer.");
    }

    /**
     * Koneksi BLE/GATT untuk printer thermal modern.
     */
    private BluetoothGatt connectBleDevice(BluetoothDevice device, StringBuilder log) throws Exception {
        final Object lock = new Object();
        final boolean[] ready = { false };
        final Exception[] failure = { null };
        final BluetoothGatt[] holder = new BluetoothGatt[1];

        BluetoothGattCallback callback = new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                synchronized (lock) {
                    if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
                        holder[0] = gatt;
                        ready[0] = true;
                        lock.notifyAll();
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED
                        || (status != BluetoothGatt.GATT_SUCCESS && status != BluetoothGatt.GATT_CONNECTION_TIMEOUT)) {
                        failure[0] = new IOException("BLE status=" + status);
                        lock.notifyAll();
                    }
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                BluetoothGattCharacteristic found = pickWriteCharacteristic(gatt);
                if (found == null) {
                    synchronized (lock) {
                        failure[0] = new IOException("BLE tidak punya characteristic tulis");
                        lock.notifyAll();
                    }
                    return;
                }
                gatt.setCharacteristicNotification(found, true);
                BluetoothGattDescriptor descriptor = found.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG);
                if (descriptor != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        gatt.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                    } else {
                        descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                        gatt.writeDescriptor(descriptor);
                    }
                }
                gattCharacteristic = found;
                synchronized (lock) {
                    holder[0] = gatt;
                    ready[0] = true;
                    lock.notifyAll();
                }
            }
        };

        BluetoothGatt gatt = device.connectGatt(getContext(), false, callback);
        synchronized (lock) {
            long deadline = System.currentTimeMillis() + 12000;
            while (!ready[0] && failure[0] == null && System.currentTimeMillis() < deadline) {
                try {
                    lock.wait(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        if (failure[0] != null && !ready[0]) {
            try {
                gatt.disconnect();
                gatt.close();
            } catch (Exception ignored) {
            }
            throw failure[0];
        }
        if (!ready[0]) {
            try {
                gatt.disconnect();
                gatt.close();
            } catch (Exception ignored) {
            }
            throw new IOException("BLE timeout");
        }

        log.append("BLE OK. ");
        return gatt;
    }

    private BluetoothGattCharacteristic pickWriteCharacteristic(BluetoothGatt gatt) {
        BluetoothGattCharacteristic fallback = null;
        for (int i = 0; i < gatt.getServices().size(); i++) {
            BluetoothGattService service = gatt.getServices().get(i);
            for (int j = 0; j < service.getCharacteristics().size(); j++) {
                BluetoothGattCharacteristic c = service.getCharacteristics().get(j);
                int props = c.getProperties();
                boolean writable = (props & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0
                    || (props & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0;
                if (!writable) {
                    continue;
                }
                UUID type = c.getUuid();
                if (BLE_WRITE_CHAR.equals(type) || BLE_WRITE_CHAR_2.equals(type) || BLE_WRITE_CHAR_3.equals(type)) {
                    return c;
                }
                if (fallback == null) {
                    fallback = c;
                }
            }
        }
        return fallback;
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!hasConnectPermission()) {
            call.save();
            requestPermissionForAlias(PERM_BLUETOOTH, call, "connectPermissionCallback");
            return;
        }
        doConnect(call);
    }

    @PermissionCallback
    private void connectPermissionCallback(PluginCall call) {
        if (!hasConnectPermission()) {
            call.reject("Izin Bluetooth ditolak.");
            return;
        }
        doConnect(call);
    }

    private void doConnect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.trim().isEmpty()) {
            call.reject("Alamat perangkat tidak valid.");
            return;
        }

        bridge.getActivity().runOnUiThread(() -> {
            new Thread(() -> {
                StringBuilder log = new StringBuilder();
                try {
                    disconnectQuiet();
                    lastError = null;

                    BluetoothAdapter adapter = getAdapter();
                    if (adapter == null) {
                        lastError = "Bluetooth tidak tersedia.";
                        call.reject(lastError);
                        return;
                    }
                    if (!adapter.isEnabled()) {
                        lastError = "Bluetooth sedang dimatikan.";
                        call.reject(lastError);
                        return;
                    }

                    BluetoothDevice device = adapter.getRemoteDevice(address.trim());

                    BluetoothSocket newSocket = connectToDevice(device, log);
                    socket = newSocket;
                    connectedAddress = device.getAddress();
                    connectedName = device.getName();
                    lastDiagnostics = log.toString();

                    JSObject ret = new JSObject();
                    ret.put("connected", true);
                    ret.put("address", connectedAddress);
                    ret.put("name", connectedName);
                    ret.put("diagnostics", lastDiagnostics);
                    call.resolve(ret);
                } catch (Exception e) {
                    // Coba BLE sebagai cadangan.
                    try {
                        BluetoothAdapter adapter = getAdapter();
                        BluetoothDevice device = adapter.getRemoteDevice(address.trim());
                        disconnectQuiet();
                        gatt = connectBleDevice(device, log);
                        connectedAddress = device.getAddress();
                        connectedName = device.getName();
                        lastDiagnostics = log.toString();

                        JSObject ret = new JSObject();
                        ret.put("connected", true);
                        ret.put("address", connectedAddress);
                        ret.put("name", connectedName);
                        ret.put("transport", "ble");
                        ret.put("diagnostics", lastDiagnostics);
                        call.resolve(ret);
                        return;
                    } catch (Exception bleError) {
                        disconnectQuiet();
                        lastError = e.getMessage() != null ? e.getMessage() : "Gagal terhubung.";
                        lastDiagnostics = log.toString();
                        call.reject(lastError + " | " + lastDiagnostics);
                    }
                }
            }).start();
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        bridge.getActivity().runOnUiThread(() -> {
            new Thread(() -> {
                disconnectQuiet();
                call.resolve(statusObject());
            }).start();
        });
    }

    @PluginMethod
    public void printRaw(PluginCall call) {
        if (!hasConnectPermission()) {
            call.reject("Izin Bluetooth belum diberikan.");
            return;
        }

        String base64 = call.getString("data");
        if (base64 == null || base64.isEmpty()) {
            call.reject("Data cetak kosong.");
            return;
        }

        bridge.getActivity().runOnUiThread(() -> {
            new Thread(() -> {
                try {
                    byte[] payload = Base64.decode(base64, Base64.DEFAULT);

                    if (socket != null && socket.isConnected()) {
                        OutputStream out = socket.getOutputStream();
                        out.write(payload);
                        out.flush();
                        lastError = null;
                        JSObject ret = new JSObject();
                        ret.put("ok", true);
                        ret.put("bytes", payload.length);
                        ret.put("transport", "spp");
                        call.resolve(ret);
                        return;
                    }

                    if (gatt != null && gattCharacteristic != null) {
                        writeBleChunked(payload);
                        lastError = null;
                        JSObject ret = new JSObject();
                        ret.put("ok", true);
                        ret.put("bytes", payload.length);
                        ret.put("transport", "ble");
                        call.resolve(ret);
                        return;
                    }

                    lastError = "Printer tidak terhubung.";
                    call.reject(lastError);
                } catch (Exception e) {
                    lastError = e.getMessage() != null ? e.getMessage() : "Gagal mencetak.";
                    disconnectQuiet();
                    call.reject(lastError);
                }
            }).start();
        });
    }

    /**
     * BLE printer biasanya hanya menerima <= 20 byte per tulis.
     */
    private void writeBleChunked(byte[] payload) throws Exception {
        int chunkSize = 20;
        int offset = 0;
        while (offset < payload.length) {
            int length = Math.min(chunkSize, payload.length - offset);
            byte[] chunk = new byte[length];
            System.arraycopy(payload, offset, chunk, 0, length);

            BluetoothGattCharacteristic characteristic = gattCharacteristic;
            characteristic.setValue(chunk);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                gatt.writeCharacteristic(characteristic, chunk, characteristic.getWriteType() == BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                    ? BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                    : BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
            } else {
                gatt.writeCharacteristic(characteristic);
            }
            Thread.sleep(40);
            offset += length;
        }
    }
}

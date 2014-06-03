// GATT Battery Service UUIDs
var BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';

// The currently displayed service and characteristics.
var batteryService;

// A mapping from device addresses to device names for found devices that expose
// a Battery service.
var batteryDevicesMap = {};

/**
 * Updates the UI based on the selected service.
 * @param {chrome.bluetoothLowEnergy.Service} service The selected GATT service
 *     to display.
 */
function selectService(service) {
  // Hide or show the appropriate elements based on whether or not
  // |serviceId| is undefined.
  document.getElementById('no-devices-error').hidden = !!service;
  document.getElementById('device-info-fields').hidden = !service;

  clearAllFields();

  batteryService = service;

  if (!service) {
    console.log('No service selected.');
    return;
  }

  console.log('GATT service selected: ' + service.instanceId);

  // TODO: handle characteristics.
}

/**
 * Helper functions to set the values of Battery Service UI fields.
 */
function setFieldValue(id, value) {
  var finalValue = (value === undefined) ? '-' : value;
  console.log('Setting field with ID "' + id + '" to value: "' + value + '"');

  var div = document.getElementById(id);
  div.innerHTML = '';
  div.appendChild(document.createTextNode(finalValue));
}

function clearAllFields() {
  setFieldValue('battery-level', undefined);
}

/**
 * Updates the dropdown menu based on the contents of |batteryDevicesMap|.
 */
function updateDeviceSelector() {
  var deviceSelector = document.getElementById('device-selector');
  var placeHolder = document.getElementById('placeholder');
  var addresses = Object.keys(batteryDevicesMap);

  deviceSelector.innerHTML = '';
  placeHolder.innerHTML = '';
  deviceSelector.appendChild(placeHolder);

  // Clear the drop-down menu.
  if (addresses.length == 0) {
    console.log('No devices found with "Battery Service"');
    placeHolder.appendChild(document.createTextNode('No connected devices'));
    return;
  }

  // Hide the placeholder and populate
  placeHolder.appendChild(document.createTextNode('Connected devices found'));

  for (var i = 0; i < addresses.length; i++) {
    var address = addresses[i];
    var deviceOption = document.createElement('option');
    deviceOption.setAttribute('value', address);
    deviceOption.appendChild(document.createTextNode(
        batteryDevicesMap[address]));
    deviceSelector.appendChild(deviceOption);
  }
}

/**
 * This is the entry point of the application. Initialize UI state and set up
 * the relevant Bluetooth Low Energy event listeners.
 */
function main() {
  // Set up the UI to look like no device was initially selected.
  selectService(undefined);

  // Initialize |batteryDevicesMap|.
  chrome.bluetooth.getDevices(function (devices) {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
    }

    if (devices) {
      devices.forEach(function (device) {
        // See if the device exposes a Battery service.
        chrome.bluetoothLowEnergy.getServices(device.address,
                                              function (services) {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            return;
          }

          if (!services)
            return;

          var found = false;
          services.forEach(function (service) {
            if (service.uuid == BATTERY_SERVICE_UUID) {
              console.log('Found Battery service!');
              found = true;
            }
          });

          if (!found)
            return;

          console.log('Found device with Battery service: ' +
                      device.address);
          batteryDevicesMap[device.address] =
              (device.name ? device.name : device.address);

          updateDeviceSelector();
        });
      });
    }
  });

  // Set up the device selector.
  var deviceSelector = document.getElementById('device-selector');
  deviceSelector.onchange = function () {
    var selectedValue = deviceSelector[deviceSelector.selectedIndex].value;

    // If |selectedValue| is empty, unselect everything.
    if (!selectedValue) {
      selectService(undefined);
      return;
    }

    // Request all GATT services of the selected device to see if it still has
    // a Battery service and pick the first one to display.
    chrome.bluetoothLowEnergy.getServices(selectedValue, function (services) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        selectService(undefined);
        return;
      }

      var foundService = undefined;
      services.forEach(function (service) {
        if (service.uuid == BATTERY_SERVICE_UUID)
          foundService = service;
      });

      selectService(foundService);
    });
  };

  // Track GATT services as they are added.
  chrome.bluetoothLowEnergy.onServiceAdded.addListener(function (service) {
    // Ignore, if the service is not a Battery service.
    if (service.uuid != BATTERY_SERVICE_UUID)
      return;

    // Add the device of the service to the device map and update the UI.
    console.log('New Battery service added: ' + service.instanceId);
    if (batteryDevicesMap.hasOwnProperty(service.deviceAddress))
      return;

    // Looks like it's a brand new device. Get information about the device so
    // that we can display the device name in the drop-down menu.
    chrome.bluetooth.getDevice(service.deviceAddress, function (device) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        return;
      }

      batteryDevicesMap[device.address] =
          (device.name ? device.name : device.address);
      updateDeviceSelector();
    });
  });

  // Track GATT services as they are removed.
  chrome.bluetoothLowEnergy.onServiceRemoved.addListener(function (service) {
    // Ignore, if the service is not a Battery service.
    if (service.uuid != BATTERY_SERVICE_UUID)
      return;

    // See if this is the currently selected service. If so, unselect it.
    console.log('Battery service removed: ' + service.instanceId);
    if (batteryService && batteryService.instanceId == service.instanceId) {
      console.log('The selected service disappeared!');
      selectService(undefined);
    }

    // Remove the associated device from the map only if it has no other Battery
    // services exposed (this will usually be the case)
    if (!batteryDevicesMap.hasOwnProperty(service.deviceAddress))
      return;

    chrome.bluetooth.getDevice(service.deviceAddress, function (device) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        return;
      }

      chrome.bluetoothLowEnergy.getServices(device.address,
                                            function (services) {
        if (chrome.runtime.lastError) {
          // Error obtaining services. Remove the device from the map.
          console.log(chrome.runtime.lastError.message);
          delete batteryDevicesMap[device.address];
          updateDeviceSelector();
          return;
        }

        var found = false;
        for (var i = 0; i < services.length; i++) {
          if (services[i].uuid == BATTERY_SERVICE_UUID) {
            found = true;
            break;
          }
        }

        if (found)
          return;

        console.log('Removing device: ' + device.address);
        delete batteryDevicesMap[device.address];
        updateDeviceSelector();
      });
    });
  });

  // Track GATT services as they change.
  chrome.bluetoothLowEnergy.onServiceChanged.addListener(function (service) {
    // This only matters if the selected service changed.
    if (!batteryService || service.instanceId != batteryService.instanceId)
      return;

    console.log('The selected service has changed');

    // Reselect the service to force an updated.
    selectService(service);
  });
}

document.addEventListener('DOMContentLoaded', main);

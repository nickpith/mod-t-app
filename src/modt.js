// var usb = require('usb');
import adler32 from 'adler-32';

// var TIMEOUT = 10000;
// var CONTROL_WRITE_ENDPOINT = 2;
const CONTROL_READ_ENDPOINT = 1;
const CONTROL_WRITE_ENDPOINT = 2;
const COMMAND_READ_ENDPOINT = 3;
const COMMAND_WRITE_ENDPOINT = 4;

function hexStringToData(hexString) {
  const size = hexString.length / 2;
  const buffer = new ArrayBuffer(size);
  const data = new DataView(buffer);

  hexString.match(/../g).forEach((value, index) => {
    data.setInt8(index, parseInt('0x' + value));
  });

  return data;
}

function encodeString(value) {
  const encoder = new TextEncoder();
  return encoder.encode(value);
}

function decodeString(value) {
  const decoder = new TextDecoder();
  return decoder.decode(value);
}

function decodeJson(value) {
  return JSON.parse(decodeString(value));
}

export default class ModT {
  constructor(device) {
    this.usbDevice = device;
    this.deviceStatus = null;
    this.disableStatusChecks = false;
    console.log(this.usbDevice);
  }

  open() {
    const device = this.usbDevice;

    console.log('opening device');
    console.log(device);
    return device.open()
    .then(() => device.selectConfiguration(1))
    .then(() => device.claimInterface(0));
  }

  writeControlString(value) {
    return this.writeControlData(encodeString(value));
  }

  writeControlHexString(value) {
    return this.writeControlData(hexStringToData(value));
  }

  writeControlData(data) {
    return this.usbDevice.transferOut(CONTROL_WRITE_ENDPOINT, data);
  }

  readControl() {
    return this.usbDevice.transferIn(CONTROL_READ_ENDPOINT, 1024);
  }

  writeCommandString(data) {
    return this.usbDevice.transferOut(COMMAND_WRITE_ENDPOINT, encodeString(data));
  }

  writeCommand(data) {
    return this.usbDevice.transferOut(COMMAND_WRITE_ENDPOINT, data);
  }

  readCommand() {
    return this.usbDevice.transferIn(COMMAND_READ_ENDPOINT, 1024);
  }

  writeControl(hex, control) {
    const thisObj = this;

    return this.writeControlHexString(hex)
    .then(result => {
      console.log(result);
      return thisObj.writeControlString(control);
    })
    .then(result => {
      console.log(result);
      return thisObj.readControl();
    })
    .then(result => {
      console.log(decodeString(result.data));
    });
  }

  async status() {
    // Check to prevent a writing of a command string when we don't want it (i.e. sending gcode file)
    if (this.disableStatusChecks) {
      return this.deviceStatus;
    }

    await this.updateStatus();
    return this.deviceStatus;
  }

  async updateStatus() {
    if (!this.disableStatusChecks) {
      const statusRequest = '{"metadata":{"version":1,"type":"status"}}';
      await this.writeCommandString(statusRequest);
    }
    
    const result = await this.readCommand();
  
    try {
      this.deviceStatus = decodeJson(result.data);
    } catch (e) {
      console.error(e);
    }
  }

  async loadFilament() {
    const loadRequest = '{"transport":{"attrs":["request","twoway"],"id":9},"data":{"command":{"idx":52,"name":"load_initiate"}}};';
    console.log('loading filament');

    await this.writeControl('24690096ff', loadRequest);
  }

  async unloadFilament() {
    const unloadRequest = '{"transport":{"attrs":["request","twoway"],"id":11},"data":{"command":{"idx":51,"name":"unload_initiate"}}};'
    console.log('unloading filament');

    await this.writeControl('246c0093ff', unloadRequest);
  }

  async sendGCode(fileBuffer) {
    try {
      // See https://github.com/tripflex/MOD-t/blob/master/scripts/send_gcode.py#L77
      console.log('Start writing gcode file');

      // Calculate adler32 checksum
      const fileSize = fileBuffer.length;
      let checksum = adler32.str(fileBuffer, 0);
      if (checksum < 0) {
        checksum += Math.pow(2, 32);
      }
      console.log(fileSize);
      console.log(checksum);
      
      // Disable status checks because the same endpoint is used when sending the file
      // so it would write a status check request when we meant to send the file data
      this.disableStatusChecks = true;
      
      // Write command with file size and checksum to tell printer how much data to expect
      console.log('Sending command with file info');
      await this.writeCommandString(`{"metadata":{"version":1,"type":"file_push"},"file_push":{"size":${fileSize},"adler32":${checksum},"job_id":""}}`);
      
      // Write gcode in batches of 20 bulk writes, each 5120 bytes. 
      // Read mod-t status between these 20 bulk writes
      let counter = 0;
      const chunkSize = 5120;
      let end = chunkSize;
      for (let start = 0; start < fileSize - 1; start = end) {
        end = start + chunkSize;
        
        if (end > fileSize - 1) {
          // Set end to filesize because slice expects second argument 
          // to be the index "before" the last character to be extracted.
          end = fileSize;
        }

        const block = fileBuffer.slice(start, end);
        console.log(`Writing block ${start}-${end}`);
        const result = await this.writeCommandString(block);
        console.log(result);

        // Read status every 20 writes so we have a progress
        counter += 1;
        if (counter >= 20) {
          await this.updateStatus();
          counter = 0;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      // Re-enable status checks since we are done
      this.disableStatusChecks = false;
    }
  }

  close() {
    console.log('closing device');
    return this.usbDevice.close();
  }
}
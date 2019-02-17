import React, { Component } from 'react';
import FileReaderInput from 'react-file-reader-input';

import logo from './logo.svg';
import './App.css';
import ModT from './modt';

const STATUS_POLLING_INTERVAL = 1000;

class App extends Component {
  constructor(props) {
    super(props);

    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.loadFilament = this.loadFilament.bind(this);
    this.unloadFilament = this.unloadFilament.bind(this);
    this.startPollingForStatus = this.startPollingForStatus.bind(this);
    this.selectGCodeFile = this.selectGCodeFile.bind(this);

    this.state = {
      device: null
    }
  }

  componentWillUnmount() {
    this.disconnect();
  }

  connect() {
    const thisObj = this;
    navigator.usb.requestDevice({filters: [{ vendorId: 11125 }]})
    .then(selectedDevice => {
      const device = new ModT(selectedDevice);
      thisObj.setState({ device: device, status: {} });
      return device.open(); 
    })
    .then(() => thisObj.startPollingForStatus())
    .catch(error => { console.log(error); });
  }

  disconnect() {
    this.stopPollingForStatus();

    if (this.state.device) {
      this.state.device.close();
      this.setState({ device: null, status: null });
    }
  }

  startPollingForStatus() {
    this.statusChecker = window.setInterval(this.getStatus, STATUS_POLLING_INTERVAL);
  }

  stopPollingForStatus() {
    if (this.statusChecker) {
      window.clearInterval(this.statusChecker);
      this.statusChecker = null;
    }
  }

  getStatus() {
    const thisObj = this;
    const device = this.state.device;
    device.status().then(() => {
      thisObj.setState({status: device.deviceStatus});
    });
  }

  loadFilament() {
    this.state.device.loadFilament();
  }

  unloadFilament() {
    this.state.device.unloadFilament();
  }

  selectGCodeFile(e, results) {
    const { device } = this.state;
      
    results.forEach(result => {
      const [e, file] = result;
      console.log(`Processing ${file.name}`)
      device.sendGCode(e.target.result);
    });
  }

  renderDeviceConnection() {
    if (this.state.device) {
      return <button onClick={this.disconnect}>Disconnect</button>;
    } else {
      return <button onClick={this.connect}>Connect</button>; 
    }
  }

  renderStatus() {
    if (!this.state.device) {
      return;
    }

    return (
      <div className="App-status" style={{}} >
        {JSON.stringify(this.state.status, null, 2)}
      </div>
    );
  }

  renderControls() {
    if (!this.state.device) {
      return;
    }

    return (
      <div>
        <button onClick={this.loadFilament}>Load Filament</button>
        <button onClick={this.unloadFilament}>Unload Filament</button>
        <FileReaderInput as="binary" id="my-file-input" onChange={this.selectGCodeFile}>
          <button>Print GCode File</button>
        </FileReaderInput>
      </div>
    );
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          {this.renderDeviceConnection()}
          {this.renderControls()}
          {this.renderStatus()}
        </header>
      </div>
    );
  }
}

export default App;


'use strict';

// ASCII only
function bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

// ASCII only
function stringToBytes(string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
        array[i] = string.charCodeAt(i);
    }
    return array.buffer;
}

// this is Nordic's UART service
var bluefruit = {
    serviceUUID: 'ffe0',
    txCharacteristic: 'ffe1', // transmit is from the phone's perspective
    rxCharacteristic: 'ffe1'  // receive is from the phone's perspective
};

var app = {
    initialize: function() {
        this.bindEvents();
        detailPage.hidden = true;
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        refreshButton.addEventListener('touchstart', this.refreshDeviceList, false);
        //sendButton.addEventListener('click', this.sendData, false);
        disconnectButton.addEventListener('touchstart', this.disconnect, false);
        deviceList.addEventListener('touchstart', this.connect, false); // assume not scrolling
    },
    onDeviceReady: function() {
        app.refreshDeviceList();
    },
    refreshDeviceList: function() {
        deviceList.innerHTML = '';
        ble.scan([], 5, app.onDiscoverDevice, app.onError);
    },
    onDiscoverDevice: function(device) {
		var dd=['HC-08','HC-05','BT12','BT05'];
		if(dd.indexOf(device.name)<0){return;}
        var listItem = document.createElement('li'),
            html = '<b>' + device.name + '</b><br/>' +
                'RSSI: ' + device.rssi + '&nbsp;|&nbsp;' +
                device.id;

        listItem.dataset.deviceId = device.id;
        listItem.innerHTML = html;
        deviceList.appendChild(listItem);
    },
    connect: function(e) {
        var deviceId = e.target.dataset.deviceId,
            onConnect = function(peripheral) {
                app.determineWriteType(peripheral);
                // subscribe for incoming data
                ble.startNotification(deviceId, bluefruit.serviceUUID, bluefruit.rxCharacteristic, app.onData, app.onError);
                //sendButton.dataset.deviceId = deviceId;
                disconnectButton.dataset.deviceId = deviceId;
                resultDiv.innerHTML = "";
                app.showDetailPage();
            };

        ble.connect(deviceId, onConnect, app.onError);
    },
    determineWriteType: function(peripheral) {
        var characteristic = peripheral.characteristics.filter(function(element) {
            if (element.characteristic.toLowerCase() === bluefruit.txCharacteristic) {
                return element;
            }
        })[0];

        if (characteristic.properties.indexOf('WriteWithoutResponse') > -1) {
            app.writeWithoutResponse = true;
        } else {
            app.writeWithoutResponse = false;
        }

    },
    onData: function(data) { // data received from Arduino
        console.log(data);
        resultDiv.innerHTML = "Received: " + bytesToString(data) + "<br/>";
        //resultDiv.scrollTop = resultDiv.scrollHeight;
		getHR(bytesToString(data));	//打資料交給getHR處理
    },
    sendData: function(event) { // send data to Arduino

        var success = function() {
            console.log("success");
            resultDiv.innerHTML = resultDiv.innerHTML + "Sent: " + messageInput.value + "<br/>";
            resultDiv.scrollTop = resultDiv.scrollHeight;
        };

        var failure = function() {
            alert("Failed writing data to the bluefruit le");
        };

        var data = stringToBytes(messageInput.value);
        var deviceId = event.target.dataset.deviceId;

        if (app.writeWithoutResponse) {
            ble.writeWithoutResponse(
                deviceId,
                bluefruit.serviceUUID,
                bluefruit.txCharacteristic,
                data, success, failure
            );
        } else {
            ble.write(
                deviceId,
                bluefruit.serviceUUID,
                bluefruit.txCharacteristic,
                data, success, failure
            );
        }

    },
    disconnect: function(event) {
        var deviceId = event.target.dataset.deviceId;
        ble.disconnect(deviceId, app.showMainPage, app.onError);
    },
    showMainPage: function() {
        mainPage.hidden = false;
        detailPage.hidden = true;
    },
    showDetailPage: function() {
        mainPage.hidden = true;
        detailPage.hidden = false;
    },
    onError: function(reason) {
        alert("ERROR: " + JSON.stringify(reason)); // real apps should use notification.alert
    }
};

function openTab(id1,id2){
	document.getElementById('ionMe').classList.remove('active');
	document.getElementById('ionMeasure').classList.remove('active');
	document.getElementById('ionStats').classList.remove('active');
	document.getElementById('ionCalendar').classList.remove('active');
	document.getElementById('ionAbout').classList.remove('active');
	document.getElementById('tabMe').classList.remove('active');
	document.getElementById('tabMeasure').classList.remove('active');
	document.getElementById('tabStats').classList.remove('active');
	document.getElementById('tabCalendar').classList.remove('active');
	document.getElementById('tabAbout').classList.remove('active');
	document.getElementById(id1).classList.add('active');
	document.getElementById(id2).classList.add('active');
}


//畫圖用 start----------------------------------------
//var t1 = setInterval(auto_update, 20);
//function auto_update(){
//	var a1 = document.querySelector("#p01");
//	var ss = get_xy(IRdata);
//	a1.setAttribute('points', ss);
	//alert(ss);
//}

//function get_xy(sen){
//  var x,y;
//  var ss='';
//  for(x=0;x<sen.length;x++){
//	y = sen[x];
//	ss += `${x*3},${(180-y/1000)*2} `;
	//alert(ss);
//  }
// return ss;
//}
//畫圖用 end----------------------------------------

//演算法 start
var REDdata = new Uint32Array(200); //filled with all zeros
var IRdata = new Uint32Array(200);	//filled with all zeros
var SpO2 = 0 ;
var oldSpO2 = 0;
var oldoutmode =0;
var i;
var mycount=0;

function getHR(data){ 	//感測器每傳來一筆資料時,就把現有的array往前移一位,然後最新資料放到RED及IR的arry的最後面
	var INdata = [];
	for(i=0;i<199;i++){
		REDdata[i]=REDdata[i+1];
		IRdata[i]=IRdata[i+1];	
	}
	INdata = data.split(" ");
	REDdata[199] = INdata[0];
	IRdata[199] = INdata[1];
}

setInterval(function(){tt(REDdata,IRdata);}, 1000);	//每秒處理一次資料



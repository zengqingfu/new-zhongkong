var express = require('express');
var app = express()
var http = require('http').Server(app);
const net = require('net');
const udp = require('dgram');
const os = require("os");
const child = require('child_process')
const loudness = require('loudness')
const networkInterfaces = os.networkInterfaces();
//创建 udp server
const udp_server = udp.createSocket('udp4');
//创建 osc server
var osc = require('node-osc');
var oscServer
var oscClient
var port = 7858 // 本机端口

/**
 * 获取当前机器的ip地址
 */
function getIpAddress() {
    let ifaces = os.networkInterfaces()
    for (let dev in ifaces) {
        let iface = ifaces[dev]
        for (let i = 0; i < iface.length; i++) {
            let { family, address, internal } = iface[i]
            if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
                udp_server.bind(port, address); // 绑定端口
                udp_server.on('listening', function () {
                    console.log('udp server linstening '+port);
                })
                oscServer = new osc.Server(7001, address);  // 主机osc ip
                oscClient = new osc.Client(address, 7000);  // 发送osc ip
                // child.exec('nbtstat -A 192.168.111.50', (err, stdout, stderr) => { 
                //     console.log(stdout.replace(/[^0-9A-Z\-\.]+/gi, "").slice(-17, stdout.length).replace(/\-/g, ":"),loudness.getVolume()) 
                // })  // 获取bat显示信息
                return address
            }
        }
    }
}
console.log(getIpAddress())

//错误处理
udp_server.on('error', function (err) {
    console.log('some error on udp server.')
    udp_server.close();
})

let endall = [ '1', '1' ]
let infodataarr
let strmsg
//udp接收消息
udp_server.on('message', function (msg, rinfo) {
    strmsg = msg.toString(); //parseInt()
     if (strmsg.indexOf('-') != -1) {
        infodataarr = endall = strmsg.split('-')
        oscClient.send('/composition/layers/'+infodataarr[0]+'/clips/'+infodataarr[1]+'/connect', 1);
        console.log('指定行例',infodataarr);
        return
    } if (strmsg.indexOf('~') != -1) {
        infodataarr = strmsg.split('~')
        oscClient.send('/composition/columns/'+infodataarr[0]+'/connect', 1);
        console.log('指定单例',infodataarr); 
        return
    } if (strmsg.indexOf('replay') != -1) {
        oscClient.send('/composition/layers/'+endall[0]+'/clips/'+endall[1]+'/transport/position', 0);
        oscClient.send('/composition/layers/'+endall[0]+'/clips/'+endall[1]+'/transport/position/behaviour/playdirection', 1);
        console.log('重播','/composition/layers/'+endall[0]+'/clips/'+endall[1]+'/transport/position')
        return
    } if (strmsg.indexOf('play') != -1) {
        oscClient.send('/composition/layers/'+endall[0]+'/clips/'+endall[1]+'/transport/position/behaviour/playdirection', 1);
        console.log('播放','/composition/layers/'+endall[0]+'/clips/'+endall[1]+'/transport/position/behaviour/playdirection'); 
        return
    } if (strmsg.indexOf('pause') != -1) {
        oscClient.send('/composition/layers/'+endall[0]+'/clips/'+endall[1]+'/transport/position/behaviour/playdirection', 2);
        console.log('暂停','/composition/layers/'+endall[0]+'/clips/'+endall[1]+'/transport/position/behaviour/playdirection'); 
        return
    } if (strmsg.indexOf('volume') != -1) {
        infodataarr = strmsg.split('volume')
        loudness.setVolume(Number(infodataarr[0]))
        console.log('音量',infodataarr,loudness.getVolume()); 
        return
    } if (strmsg.indexOf('restart') != -1) {
        child.exec('shutdown -r -t 00', (err, stdout, stderr) => {})
        console.log('重启'); 
        return
    } if (strmsg.indexOf('off') != -1) {
        child.exec('shutdown -s -t 00', (err, stdout, stderr) => {})
        console.log('关机'); 
        return
    }
    console.log(strmsg)
})
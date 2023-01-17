var express = require('express');
var app = express()
var http = require('http').Server(app);
const net = require('net');
const udp = require('dgram');
const os = require("os");
const child = require('child_process')
const networkInterfaces = os.networkInterfaces();
//创建 udp server
const udp_server = udp.createSocket('udp4');
//创建 osc server
var osc = require('node-osc');
var oscServer
var oscClient
var txtip // 接收端ip前缀
var txtport = 7858 // 接收端口
var port = 7857 // 本机端口

// 加载配制json文件
var jsonFile = require('jsonfile')
var fileName = 'data.json'
var loadjson
jsonFile.readFile(fileName, function (err, jsonData) {
    if (err) throw err;
    loadjson = jsonData
    txtip = loadjson.txtip.ip
});
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

/**
 * 创建魔术封包
 * @param {string} mac 网卡MAC地址
 * @returns {Buffer}
 */
function createMagicPacket(mac) {
    mac = mac.replace(/[^0-9a-fA-F]/g, '');
    if (mac.length != 12) {
        throw new Error(`Bad MAC address "${mac}"`);
    }
    const bufMac = Buffer.from(mac, 'hex');
    let bufRes = Buffer.alloc(6, 0xff);
    for (let i = 0; i < 16; i++) {
        bufRes = Buffer.concat([bufRes, bufMac]);
    }
    return bufRes;
}
/**
 * 通过网络唤醒
 */
function wakeOnLAN(mac, options) {
    options = Object.assign({
        address: '255.255.255.255',
        port: 7
    }, options);
    return new Promise((resolve, reject) => {
        const packet = createMagicPacket(mac);
        const socket = udp.createSocket(
            net.isIPv6(options.address) ? 'udp6' : 'udp4'
        );
        socket.on('error', function (err) {
            socket.close();
            reject(err);
        });
        socket.once('listening', function () {
            socket.setBroadcast(true);
        });
        socket.send(
            packet,
            0,
            packet.length,
            options.port,
            options.address,
            function (err, res) {
                socket.close();
                if (err) {
                    return reject(err);
                }
                resolve(res == packet.length);
            }
        );
    });
}

function oncompate (infoip) {
    if (!loadjson.macip[infoip]) {
        return
    }
    wakeOnLAN(loadjson.macip[infoip].mac).then(
        res => {
            // console.info(networkInterfaces);
            // console.log(res);
        },
        err => {
            // console.log(err.message);
        }
    );
}
// 定时任务
setInterval(function () {
    let timeint = new Date().toLocaleString('chinese',{hour12:false}).slice(9,18)
    for (time in loadjson.timing) {
        let timejson = loadjson.timing[time]
        if (loadjson.timing[time].time == timeint && loadjson.timing[time].loop == "day") {
            setudpfn (timejson.content,timejson.setip,timejson.port,timejson.text)
        }
        if (timejson.loop == "second" && Number(timejson.time.replace(/:/g,"")) < Number(timeint.replace(/:/g,""))) {
            loadjson.timing[time].playtime-=1
            if (loadjson.timing[time].playtime == 0) {
                loadjson.timing[time].playtime = loadjson.timing[time].looptime
                setudpfn (timejson.content,timejson.setip,timejson.port,timejson.text)
            }
        }
    }
},1000)

// 监听接收osc
oscServer.on("message",function(msg, rinfo){  // 监听接收osc
    if (loadjson.oscreceive[msg[0]]) {
        for (let item in loadjson.oscreceive[msg[0]].timelist) {
            let jsonosctime = loadjson.oscreceive[msg[0]].timelist[item]
            if ((msg[1]*loadjson.oscreceive[msg[0]].maxtime/1000).toFixed(1) == (jsonosctime.time/1000).toFixed(1) && jsonosctime.timebo == 0) {
                setudpfn (jsonosctime.content,jsonosctime.setip,jsonosctime.port,jsonosctime.text)
                jsonosctime.timebo = 1
                setTimeout(function () {
                    jsonosctime.timebo = 0
                },1000)
            }
        }
    }
})

//udp接收消息
udp_server.on('message', function (msg, rinfo) {
    let strmsg = msg.toString(); //parseInt()
    infoplay(strmsg)
    // if (strmsg == '1000') {
    //     child.exec(`nbtstat -A 192.168.111.50`, (err, stdout, stderr) => { console.log(stdout.replace(/[^0-9A-Z\-\.]+/gi, "").slice(-17, stdout.length).replace(/\-/g, ":"),7474) })  // 获取bat显示信息
    // } 
    // udp_server.send(msg.toString(), 0, strmsg.length, rinfo.port, rinfo.address); //将接收到的消息返回给客户端
    // console.log(`udp server received data: ${strmsg} from ${rinfo.address}:${rinfo.port}-${new Date()}`)
})

function bufinfo(infodata) { // 发送16进制继电器信息
    udp_server.send(bufferfn(infodata.content),0,bufferfn(infodata.content).length,infodata.port,infodata.setip)
}

function bufferfn (data) {   //将一个十六进制报文转为字符数组
    let strs = data.split(" ");
    for(let i = 0;i<strs.length;i++){
        strs[i] = "0x"+strs[i];
    }//每个字符加上0x
    strs = Buffer.from(strs)
    return strs
}

function setudpfn (content,ip,port,text) { // 发送udp
    udp_server.send(content, port, ip)
    conlogfn (ip,text) // 打印信息
}

function strinfo(infodata) { // 分析信息
    if (infodata.indexOf('&') > 0) {
        let infodataarr = infodata.split('&')
        if (infodataarr[0] == 'all') {
            for (item in loadjson.macip) {
                orstrinfo (item,infodataarr[1])
            }
        } else {
            orstrinfo (infodataarr[0],infodataarr[1])
        }
    } else {
        if (loadjson.custom[infodata]) { //  找到自定信息发解析发送
            let loadjsonarr = loadjson.custom[infodata]
            if (loadjsonarr.class == 'buf') {
                bufinfo(loadjsonarr)
            }else{
                udp_server.send(loadjsonarr.content, loadjsonarr.port, loadjsonarr.setip)
            }
            conlogfn (loadjsonarr.setip+':'+loadjsonarr.port,loadjsonarr.text) // 打印信息
        }
    }
}

function orstrinfo (ip,content) { // 分析信息分类并发送
    conlogfn (ip,content) // 打印信息
    if (content == 'on') {
        oncompate(ip) // 开机直接找mac
    } else if (content == 'up' || content == 'down' || content == 'mute' ) {
        soundfn(ip,content) // 音量控制
    }else{
        udp_server.send(content, txtport, txtip + ip)
    }

}

function soundfn(ip,content) {
    if (!loadjson.macip[ip]) {
        return
    }
    if (content == 'up') {
        loadjson.macip[ip].volume +=10
    } else if (content == 'down') {
        loadjson.macip[ip].volume -=10
    } else if (content == 'mute') {
        loadjson.macip[ip].volume =0
    }
    udp_server.send(loadjson.macip[ip].volume+'volume', txtport, txtip + ip)
}

function infoplay(infodata) { // 拆分多个信息
    if (infodata.indexOf(',') > 0) {
        for (item in infodata.split(',')) {
            strinfo(infodata.split(',')[item])
        }
    } else {
        strinfo(infodata)
    }
}

function conlogfn (ip,text) {
    console.log(ip,text,new Date().toLocaleString('chinese',{hour12:false}))
}

app.use('/ctrl', function (req, res, next) {
    // console.log(req.headers)
    var result = "";
    req.on("data", (chuck) => {
        result += chuck
    })
    req.on("end", () => {
        // console.log(result)
        infoplay(result)
        res.end('OK')
    })
});

app.get('/volume', (req, res) => { // 接收udp命令
    // console.log(req)
    res.json(loadjson.macip);
});

app.use(express.static('dist'));
http.listen('7859', () => {
    console.log('Server started on port 7859');
});
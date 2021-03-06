var fsynthcommon = require('../common');
var http = require('http');
var express = require('express');
var ShareDB = require('sharedb');
var ShareDB_logger = require('sharedb-logger');
var WebSocket = require('ws');
var cluster	= require('cluster');
var clusterControl = require('strong-cluster-control');
var WebSocketJSONStream = require('websocket-json-stream');
var winston = require('winston');
var shareDbRedisPubSub = require('sharedb-redis-pubsub');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ 'timestamp': true, 'colorize': true })
    ]
});

clusterControl.start({
        size: clusterControl.CPUS,
        shutdownTimeout: 1000,
        terminateTimeout: 5000,
        throttleDelay: 5000
    }).on('error', function(er) {
        logger.error("Cluster error occured: ", er);
    }).on('startWorker', function(worker) {
        logger.info("Worker %s %s", worker.process.pid, "started");
    }).on('stopWorker', function(worker, code, signal) {
        if (code) {
            logger.warn("Worker %s stopped with code: %s", worker.process.pid, code);
        } else {
            logger.warn("Worker %s was stopped.", worker.process.pid);
        }
    });

if (cluster.isMaster) {
    process.on('SIGUSR1', function() {
        logger.warn("SIGUSR1 received, restarting workers in progress...");

        clusterControl.restart();
    });
    
    process.on('SIGUSR2', function() {
        logger.info("Workers status:", clusterControl.status().workers);
    });

	return;
}

var clientVerification = function (info) {
    if (fsynthcommon.allow_fsdb_origin.indexOf(info.origin) !== -1) {
        logger.info("%s %s %s %s %s", process.pid, info.req.socket.remoteAddress, 'Client', 'user-agent:', info.req.headers['user-agent']);
        logger.info("%s %s %s %s %s", process.pid, info.req.socket.remoteAddress, 'Client', 'accept-language:', info.req.headers['accept-language']);
        
        return true;
    }
    
    logger.warn("%s %s %s %s", process.pid, info.req.socket.remoteAddress, 'Client refused:\n', info.req.rawHeaders);

    return false;
};

const db = require('sharedb-mongo')('mongodb://localhost:27017/fs');

var share = new ShareDB({ db: db, pubsub: shareDbRedisPubSub('redis://localhost:6379/0') });

var sharedb_logger = new ShareDB_logger(share);

var app = express();
var server = http.createServer(app);

var wss = new WebSocket.Server({ server: server, verifyClient: clientVerification });
wss.on('connection', function(ws, req) {
    var real_ip = ws._socket.remoteAddress;

    if (real_ip !== "127.0.0.1" && real_ip !== "::ffff:127.0.0.1" && real_ip !== "::1") {
        ws.close();

        logger.warn("%s %s %s", process.pid, real_ip, "has invalid address.");
    }

    if (ws.upgradeReq !== undefined) {
        if (ws.upgradeReq.headers['x-forwarded-for']) {
            real_ip = ws.upgradeReq.headers['x-forwarded-for'];
        }
    }

    logger.info("%s %s %s", process.pid, real_ip, "connected");
    logger.info('%s Total clients: %s', process.pid, wss.clients.length);
    
    var stream = new WebSocketJSONStream(ws);
    share.listen(stream);
});

wss.on('close', function(ws, req) {
    logger.info("client disconnected");
});

server.listen(fsynthcommon.fsdb_port);

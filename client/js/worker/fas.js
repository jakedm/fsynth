/*jslint browser: true*/
/*continue: true*/
/*global self,postMessage*/

/*
    Dedicated websocket "fas" worker, send data to the "Fragment Synthesizer Band-aid" program (aka "fas") if enabled
    https://github.com/grz0zrg/fas
*/

/***********************************************************
    Fields.
************************************************************/

var _fas = false,
    _fas_timeout,
    _fas_ws,

    _FAS_ENABLE = 0,
    _FAS_DISABLE = 1,
    _FAS_AUDIO_INFOS = 2,
    _FAS_GAIN_INFOS = 3,
    _FAS_FRAME = 4;


/***********************************************************
    Functions.
************************************************************/

var _getAudioInfosBuffer = function (audio_infos) {
    if (audio_infos.h <= 0 ||
        audio_infos.octaves <= 0 ||
        audio_infos.base_freq <= 0) {
        return;
    }

    var audio_infos_buffer = new ArrayBuffer(8 + 4 + 4 + 8),
        uint8_view = new Uint8Array(audio_infos_buffer, 0, 1),
        uint32_view = new Uint32Array(audio_infos_buffer, 8, 2),
        float64_view = new Float64Array(audio_infos_buffer, 16);

    uint8_view[0] = 0; // packet id
    uint32_view[0] = audio_infos.h;
    uint32_view[1] = audio_infos.octaves;

    float64_view[0] = audio_infos.base_freq;

    return audio_infos_buffer;
};

var _getGainBuffer = function (audio_infos) {
    var gain_buffer = new ArrayBuffer(8 + 8),
        uint8_view = new Uint8Array(gain_buffer, 0, 1),
        float64_view = new Float64Array(gain_buffer, 8);

    uint8_view[0] = 2;
    float64_view[0] = audio_infos.gain;

    return gain_buffer;
};

var _sendAudioInfos = function (audio_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        setTimeout(_sendAudioInfos, 1000, audio_infos);
        return;
    }

    try {
        _fas_ws.send(_getAudioInfosBuffer(audio_infos));
    } finally {

    }
};

var _sendGain = function (audio_infos) {
    if (!_fas) {
        return;
    }

    if (_fas_ws.readyState !== 1) {
        setTimeout(_sendGain, 1000, audio_infos);
        return;
    }

    try {
        _fas_ws.send(_getGainBuffer(audio_infos));
    } finally {

    }
};

var _sendFrame = function (frame, mono) {
    if (_fas_ws.readyState !== 1) {
        return;
    }
    
    var frame_data = new Uint8Array(frame[0]),
        fas_data = new ArrayBuffer(8 + 4 + 4 + (frame_data.length * frame.length)),
        uint8_view = new Uint8Array(fas_data, 0, 1),
        uint32_view = new Uint32Array(fas_data, 8, 2),
        data_view = [],
        i = 0;
    
    uint8_view[0] = 1; // packet id
    uint32_view[0] = frame.length;
    uint32_view[1] = mono === true ? 1 : 0;

    for (i = 0; i < frame.length; i += 1) {
        uint8_view = new Uint8Array(fas_data, 16 + frame_data.length * i, frame_data.length);
        
        uint8_view.set(new Uint8Array(frame[i]));
    }

    try {
        _fas_ws.send(fas_data);
    } finally {

    }
}

var _disconnect = function () {
    if (_fas_ws) {
        _fas_ws.close(4000);
    }

    clearTimeout(_fas_timeout);
};

var _connect = function (opts) {
    _fas_ws = new WebSocket("ws://" + opts.address);
    _fas_ws.binaryType = "arraybuffer";

    _fas_ws.onopen = function () {
        postMessage({
                status: "open"
            });

        _sendAudioInfos(opts.audio_infos);
        _sendGain(opts.audio_infos);
    };

    _fas_ws.onerror = function (event) {
            postMessage({
                    status: "error"
                });
        };

    _fas_ws.onclose = function (event) {
            if (_fas && event.code !== 4000) {
                postMessage({
                        status: "close"
                    });

                clearTimeout(_fas_timeout);
                _fas_timeout = setTimeout(_connect, 5000, opts);
            }
        };
};

self.onmessage = function (m) {
    "use strict";

    var data = m.data,

        cmd = data.cmd,
        arg = data.arg;

    if (cmd === _FAS_ENABLE) {
        _fas = true;

        _connect(arg);
    } else if (cmd === _FAS_DISABLE) {
        _fas = false;

        _disconnect();
    } else if (cmd === _FAS_AUDIO_INFOS) {
        _sendAudioInfos(arg);
    } else if (cmd === _FAS_GAIN_INFOS) {
        _sendGain(arg);
    } else if (cmd === _FAS_FRAME) {
        _sendFrame(arg, data.mono);
    }
};

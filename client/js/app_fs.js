/* jslint browser: true */

/* global CodeMirror, performance*/

// WUI - https://github.com/grz0zrg/wui
/*#include wui/wui.js*/

// CodeMirror - https://codemirror.net/
/*#include codemirror/codemirror.js*/
/*#include codemirror/addon/search/searchcursor.js*/
/*#include codemirror/addon/search/match-highlighter.js*/
/*#include codemirror/addon/search/matchesonscrollbar.js*/
/*#include codemirror/addon/edit/closebrackets.js*/
/*#include codemirror/addon/edit/matchbrackets.js*/
/*#include codemirror/addon/scroll/simplescrollbars.js*/
/*#include codemirror/addon/scroll/annotatescrollbar.js*/
/*#include codemirror/addon/selection/active-line.js*/
/*#include codemirror/addon/display/fullscreen.js*/
/*#include codemirror/codemirror_glsl.js*/

// sharedb - https://github.com/share/sharedb
/*#include sharedb/sharedb.js*/
/*#include sharedb/ot-text.js*/

/*#include resize_throttler/resize_throttler.js*/

window.onload = function() {
    "use strict";
    
    document.body.style.overflow = "hidden";
    
    /*#include electron.js*/
    
var FragmentSynth = function (params) {
    "use strict";

    /***********************************************************
        Globals.
    ************************************************************/

    /*#include tools.js*/
    /*#include notification.js*/

    var _getSessionName = function () {
        var url_parts;
        
        if (params.session_name) {
            return params.session_name;
        } else {
            url_parts = window.location.pathname.split('/');

            return url_parts[url_parts.length - 1];
        }
    };

    window.performance = window.performance || {};
    performance.now = (function() {
      return performance.now       ||
             performance.mozNow    ||
             performance.msNow     ||
             performance.oNow      ||
             performance.webkitNow ||
             function() { return new Date().getTime(); };
    })();

    window.AudioContext = window.AudioContext || window.webkitAudioContext || false;

    window.requestAnimationFrame =  window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame;

    if (!window.AudioContext) {
        _fail("The Web Audio API is not available, please use a Web Audio capable browser.", true);

        return;
    }

    if (!window.cancelAnimationFrame) {
        _fail("The cancelAnimationFrame function is not available, please use a web browser with cancelAnimationFrame support.", true);

        return;
    }

    if (!window.localStorage) {
        _fail("The localStorage API is not available, please use a web browser with localStorage support.", true);

        return;
    }

    if (!window.FileReader) {
        _fail("FileReader API is not available, please use a web browser with FileReader support.", true);

        return;
    }

    if (!window.Blob) {
        _fail("Blob API is not available, please use a web browser with Blob support.", true);

        return;
    }

    if (!window.File) {
        _fail("File API is not available, please use a web browser with File API support.", true);

        return;
    }

    if (typeof(Worker) === "undefined") {
        _fail("Web Workers are not available, please use a web browser with Web Workers support.", true);

        return;
    }

    /***********************************************************
        Fields.
    ************************************************************/

    var _fs_state = 1,

        _username = localStorage.getItem('fs-user-name'),
        _local_session_settings = localStorage.getItem(_getSessionName()),

        _red_curtain_element = document.getElementById("fs_red_curtain"),
        _user_name_element = document.getElementById("fs_user_name"),
        _time_infos = document.getElementById("fs_time_infos"),
        _hz_infos = document.getElementById("fs_hz_infos"),
        _xy_infos = document.getElementById("fs_xy_infos"),
        _osc_infos = document.getElementById("fs_osc_infos"),
        _poly_infos_element = document.getElementById("fs_polyphony_infos"),

        _haxis_infos = document.getElementById("fs_haxis_infos"),
        _vaxis_infos = document.getElementById("fs_vaxis_infos"),

        _canvas_container = document.getElementById("canvas_container"),
        _canvas = document.createElement("canvas"),

        _canvas_width  = 1024,
        _canvas_height = 439,//Math.round(window.innerHeight / 2) - 68,

        _canvas_width_m1 = _canvas_width - 1,
        _canvas_height_mul4 = _canvas_height * 4,

        _render_width = _canvas_width,
        _render_height = _canvas_height,
        
        _feedback = {
            enabled: true,
            pframe: [],
            index: 0,
            program: null,
            texture: null
        },

        _code_editor,
        _code_editor_element = document.getElementById("code"),
        _code_editor_theme = localStorage.getItem('fs-editor-theme'),
        _code_editor_theme_link,
        _code_editor_highlight = {
                showToken: /\w/,
                annotateScrollbar: true
            },
        _code_editor_settings = {
            value: "",
            theme: ((_code_editor_theme === null) ? "seti" : _code_editor_theme),
            matchBrackets: true,
            //autoCloseBrackets: true,
            lineNumbers: true,
            styleActiveLine: true,
            scrollbarStyle: "native",
            mode: "text/x-glsl",
            extraKeys: {
                "F11": function (cm) {
                    cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                },
                "Esc": function (cm) {
                    if (cm.getOption("fullScreen")) {
                        cm.setOption("fullScreen", false);
                    }
                }
            }
        },
        
        // this is the amount of free uniform vectors for Fragment regular uniforms and session custom uniforms
        // this is also used to assign uniform vectors automatically for polyphonic uses
        // if the GPU cannot have that much uniforms (with polyphonic uses), this will be divided by two and the polyphonic computation will be done again
        // if the GPU cannot still have that much uniforms (with polyphonic uses), there will be a polyphony limit of 16 notes, this is a safe limit for all devices nowaday
        _free_uniform_vectors = 320,
        
        // note-on/note-off related stuff (MIDI keyboard etc.)
        _keyboard = {
            data: [],
            data_components: 4,
            // polyphonic capabilities is set dynamically from MAX_FRAGMENT_UNIFORM_VECTORS parameter
            // ~221 MAX_FRAGMENT_UNIFORM_VECTORS value will be generally the default for desktop
            // this permit a polyphony of ~60 notes with 4 components for each notes and by considering the reserved uniform vectors
            // all this is limited by the MAX_FRAGMENT_UNIFORM_VECTORS parameter on the GPU taking into account the other Fragment uniform PLUS sessions uniform
            // at the time of this comment in 2017, 99.9% of desktop devices support up to 221 uniform vectors while there is a 83.9% support for up to 512 uniform vectors,
            // this amount to ~192 notes polyphony, a capability of 1024 lead to ~704 notes polyphony and so on...
            data_length: 60 * 4,
            // amount of allocated uniform vectors
            uniform_vectors: 0,
            pressed: {},
            polyphony_max: 60,
            polyphony: 0 // current polyphony
        },
        
        _webgl = {
            max_fragment_uniform_vector: -1
        },

        _compile_timer,

        _undock_code_editor = false,

        _xyf_grid = false,

        _glsl_error = false,
        
        // settings
        _show_globaltime = true,
        _show_oscinfos = false,
        _show_polyinfos = false,
        _show_slicebar = true,
        _cm_highlight_matches = false,
        _cm_show_linenumbers = true,
        _cm_advanced_scrollbar = false,

        // mouse cursor over canvas
        _cx,
        _cy,

        _mx,
        _my,

        _nmx,
        _nmy,

        _cnmx,
        _cnmy,

        _mouse_btn = 0,

        _LEFT_MOUSE_BTN = 1,
        _RIGHT_MOUSE_BTN = 2,

        _fps = 60,

        _raf,

        _gl,
        _gl2 = false,
        
        _pbo = null,

        _play_position_markers = [],

        _webgl_opts = {
                preserveDrawingBuffer: true,
                antialias: true,
                depth: false
            },

        _prev_data = [],
        _temp_data = new Uint8Array(_canvas_height_mul4),
        _data = [],
        _output_channels = 1,

        _analysis_canvas,
        _analysis_canvas_ctx,
        
        _analysis_canvas_tmp,
        _analysis_canvas_tmp_ctx,
        
        _analysis_log_scale = true,
        _analysis_colored = true,
        _analysis_speed = 2,
        
        _midi_out_f,
        _midi_out = true,

        _quad_vertex_buffer,

        _program,

        _controls = {},

        _fragment_input_data = [],

        _input_panel_element = document.getElementById("fs_input_panel"),

        _codemirror_line_widgets = [],

        _time = 0,

        _pause_time = 0,

        _hover_freq = null,

        _input_channel_prefix = "iInput";


    /***********************************************************
        App. Includes.
    ************************************************************/

    /*#include config.js*/
    /*#include audio.js*/
    /*#include graphics.js*/
    /*#include glsl.js*/
    /*#include network.js*/
    /*#include discuss.js*/
    /*#include inputs.js*/
    /*#include editor.js*/
    /*#include transports.js*/
    /*#include ui.js*/
    /*#include midi.js*/
    /*#include fas.js*/

    /***********************************************************
        Functions.
    ************************************************************/

    var _initializePBO = function () {
        if (_gl2) {
            if (_pbo) {
                _gl.deleteBuffer(_pbo);  
            }

            _pbo = _gl.createBuffer();
            _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, _pbo);
            _gl.bufferData(_gl.PIXEL_PACK_BUFFER, 1 * _canvas.height * 4, _gl.STATIC_READ);
            _gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, null);
        }
    };
    
    var _saveLocalSessionSettings = function () {
        var session_name = _getSessionName();

        return function () {
            try {
                localStorage.setItem(session_name, JSON.stringify(_local_session_settings));
            } catch (e) {
                _notification("Can't save session local settings due to localStorage error. (local storage is likely full)");
            }
        };
    }();
    
    var _updateScore = function (update_obj, update) {
        var prev_base_freq = _audio_infos.base_freq,
            prev_octave = _audio_infos.octaves,

            base_freq = _audio_infos.base_freq,
            octave = _audio_infos.octaves,

            prev_width = _canvas_width,
            prev_height = _canvas_height;

        if (update_obj["base_freq"] !== undefined) {
            base_freq = update_obj.base_freq;
        }

        if (update_obj["octave"] !== undefined) {
            octave = update_obj.octave;
        }

        _disableNotesProcessing();
        
        _stopOscillators();

        if (update_obj.height) {
            _canvas_height = update_obj.height;
            _canvas.height = _canvas_height;
            _canvas.style.height = _canvas_height + 'px';
            _canvas_height_mul4 = _canvas_height * 4;

            _vaxis_infos.style.height = _canvas_height + "px";

            _temp_data = new Uint8Array(_canvas_height_mul4);
            _allocate_frames_data();

            _gl.viewport(0, 0, _canvas.width, _canvas.height);

            _updatePlayMarkersHeight(_canvas_height);
            
            _initializePBO();
        }

        if (update_obj.width) {
            _canvas_width = update_obj.width;
            _canvas.width = _canvas_width;
            _canvas.style.width = _canvas_width + 'px';

            _gl.viewport(0, 0, _canvas.width, _canvas.height);
            
            _initializePBO();
        }

        _generateOscillatorSet(_canvas_height, base_freq, octave);

        _compile();

        _updateCodeView();

        _updateAllPlayPosition();

        _fasNotify(_FAS_AUDIO_INFOS, _audio_infos);

        _enableNotesProcessing();

        WUI_RangeSlider.setValue("fs_score_width_input", _canvas_width);
        WUI_RangeSlider.setValue("fs_score_height_input", _canvas_height);
        WUI_RangeSlider.setValue("fs_score_octave_input", octave);
        WUI_RangeSlider.setValue("fs_score_base_input", base_freq);

        if (update) {
            _shareSettingsUpd([
                    prev_width, _canvas_width,
                    prev_height, _canvas_height,
                    prev_octave, octave,
                    prev_base_freq, base_freq
                ]);
        }
        
        _buildFeedback();
    };

    /***********************************************************
        Init.
    ************************************************************/
    
    _audioInit();

    if (!_username) {
        _username = "Anonymous";
    }

    _user_name_element.innerHTML = _username;

    //_canvas_width = _getElementOffset(_canvas_container).width;

    _render_width = _canvas_width;

    _canvas.width  = _render_width;
    _canvas.height = _render_height;

    _canvas.style.width  = _canvas_width  + 'px';
    _canvas.style.height = _canvas_height + 'px';

    _canvas_container.appendChild(_canvas);

    _vaxis_infos.style.height = _canvas_height + "px";

    // CodeMirror
    if (!_code_editor_theme) {
        _code_editor_theme = "seti";
    }

    _changeEditorTheme(_code_editor_theme);
    
    _code_editor = new CodeMirror(_code_editor_element, _code_editor_settings);
    _code_editor.setValue(document.getElementById("fragment-shader").text);

    CodeMirror.on(_code_editor, 'change', function (instance, change_obj) {
        clearTimeout(_compile_timer);
        _compile_timer = setTimeout(_compile, 500);
    });

    CodeMirror.on(_code_editor, 'changes', function (instance, changes) {
        _shareCodeEditorChanges(changes);
    });
    
    // WebGL 2 check
    _gl = _canvas.getContext("webgl2", _webgl_opts) || _canvas.getContext("experimental-webgl2", _webgl_opts);
    if (!_gl) {
        _gl = _canvas.getContext("webgl", _webgl_opts) || _canvas.getContext("experimental-webgl", _webgl_opts);
    } else {
        _gl2 = true;
        
        _initializePBO();
    }

    if (!_gl) {
        _fail("The WebGL API is not available, please try with a WebGL ready browser.", true);

        return;
    }
    
    // compute default polyphony max based on GPU capabilities
    _webgl.max_fragment_uniform_vector = _gl.getParameter(_gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    
    _keyboard.uniform_vectors = _webgl.max_fragment_uniform_vector - _free_uniform_vectors;
    
    _keyboard.data_length = _keyboard.uniform_vectors * _keyboard.data_components;
    _keyboard.polyphony_max = _keyboard.uniform_vectors;
    
    if (_keyboard.uniform_vectors <= 16) {
        _keyboard.uniform_vectors = _webgl.max_fragment_uniform_vector - (_free_uniform_vectors / 2);
        
        // still not? default to 8, all devices should be fine nowaday with 32 uniform vectors
        if (_keyboard.uniform_vectors <= 16) {
            _keyboard.data_length = 16 * _keyboard.data_components;
            _keyboard.polyphony_max = 16;
        } else {
            _keyboard.data_length = _keyboard.uniform_vectors * _keyboard.data_components;
            _keyboard.polyphony_max = _keyboard.uniform_vectors;
        }
    }
    
    _buildScreenAlignedQuad();

    _gl.viewport(0, 0, _canvas.width, _canvas.height);

    _compile();

    // setup user last settings for this session if any
    if (_local_session_settings) {
        _local_session_settings = JSON.parse(_local_session_settings);
        if ('gain' in _local_session_settings) {
            _volume = _local_session_settings.gain;

            WUI_RangeSlider.setValue("mst_slider", _volume, true);
        }
        
        if ('midi_settings' in _local_session_settings) {
            _loadMIDISettings(_local_session_settings.midi_settings);
        }
    } else {
        _local_session_settings = {
            gain: _volume,
        };
    }

    //_addPlayPositionMarker(_canvas_width / 4);
    //_addPlayPositionMarker(_canvas_width - _canvas_width / 4);

    _allocate_frames_data();
    
    _uiInit();
    
    _midiInit();
    
    _fasInit();

    _initNetwork();

    //_play();
    
    /*#include events.js*/
    
    window.gb_code_editor_settings = _code_editor_settings;
    window.gb_code_editor = _code_editor;
    window.gb_code_editor_theme = _code_editor_theme;
    
    document.body.style.overflow = "visible";
    
    if (params.fas) {
        _fasEnable();
    }
    
    _buildFeedback();
};
    
    if (_electronInit()) {
        
    } else {
        FragmentSynth({});
    }
}

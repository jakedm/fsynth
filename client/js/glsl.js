/* jslint browser: true */


/***********************************************************
    Fields.
************************************************************/

var _uniform_location_cache = {},
    _current_program;


/***********************************************************
    Functions.
************************************************************/

var _createAndLinkProgram = function (vertex_shader, fragment_shader) {
    if (!vertex_shader || !fragment_shader) {
        return;
    }

    var prog = _gl.createProgram();

    _gl.attachShader(prog, vertex_shader);
    _gl.attachShader(prog, fragment_shader);

    _gl.linkProgram(prog);

    if (!_gl.getProgramParameter(prog, _gl.LINK_STATUS)) {
        _fail("Failed to link program: " + _gl.getProgramInfoLog(prog));
    }

    _gl.deleteShader(vertex_shader);
    _gl.deleteShader(fragment_shader);

    return prog;
};

var _createShader = function (shader_type, shader_code) {
    var shader = _gl.createShader(shader_type),

        log;

    _gl.shaderSource(shader, shader_code);
    _gl.compileShader(shader);

    if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
        log = _gl.getShaderInfoLog(shader);

        _fail("Failed to compile shader: " + log);

        _parseCompileOutput(log);

        _gl.deleteShader(shader);

        shader = false;
    }

    return shader;
};

var _useProgram = function (program) {
    if (_current_program !== program) {
        _gl.useProgram(program);
        _current_program = program;
    }
};

var _getUniformLocation = function (name, program) {
    var prog = _program;
    
    if (!_uniform_location_cache[name]) {
        if (program !== undefined) {
            prog = program;
        }

        _uniform_location_cache[name] = _gl.getUniformLocation(prog, name);
    }
    
    return _uniform_location_cache[name];
};

var _setUniform = function (gl_ctx, type_str, program, name, value) {
    var uniform_location = _getUniformLocation(name, program);//gl_ctx.getUniformLocation(program, name);
    
    if (type_str === "bool" || type_str === "int" || type_str === "uint") {
        gl_ctx.uniform1i(uniform_location, value);
    } else if (type_str === "float") {
        gl_ctx.uniform1f(uniform_location, value);
    }
};

var _setUniforms = function (gl_ctx, type_str, program, name, values, comps) {
    var uniform_location = _getUniformLocation(name, program);

    if (type_str === "bool" || 
        type_str === "int" || 
        type_str === "uint") {
        gl_ctx.uniform1iv(uniform_location, new Int32Array(values));
    } else if (type_str === "float") {
        gl_ctx.uniform1fv(uniform_location, new Float32Array(values));
    } else {
        if (type_str === "bvec" || 
            type_str === "ivec" || 
            type_str === "uvec") {
            if (comps === 2) {
                gl_ctx.uniform2iv(uniform_location, new Int32Array(values));
            } else if (comps === 3) {
                gl_ctx.uniform3iv(uniform_location, new Int32Array(values));
            } else if (comps === 4) {
                gl_ctx.uniform4iv(uniform_location, new Int32Array(values));
            }
        } else if (type_str === "vec") {
            if (comps === 2) {
                gl_ctx.uniform2fv(uniform_location, new Float32Array(values));
            } else if (comps === 3) {
                gl_ctx.uniform3fv(uniform_location, new Float32Array(values));
            } else if (comps === 4) {
                gl_ctx.uniform4fv(uniform_location, new Float32Array(values));
            }
        }
    }
};

var _compile = function () {
    var frag,

        glsl_code = "",

        position,

        fragment_input,
        
        ctrl_name,
        ctrl_obj,
        
        temp_program,

        i = 0;
    
    // add our uniforms
    glsl_code = "precision mediump float; uniform float globalTime; uniform float octave; uniform float baseFrequency; uniform vec4 mouse; uniform vec4 date; uniform vec2 resolution; uniform vec4 keyboard[" + _keyboard.polyphony_max + "];"
    
    if (_feedback.enabled) {
        glsl_code += "uniform sampler2D pFrame;";
    }
    
    // add htoy
    glsl_code += "float htoy(float frequency) {return (resolution.y - (resolution.y - (log(frequency / baseFrequency) / log(2.)) * (resolution.y / octave))) / resolution.y;}";

    // add inputs uniforms
    for (i = 0; i < _fragment_input_data.length; i += 1) {
        fragment_input = _fragment_input_data[i];

        if (fragment_input.type === 0 ||
           fragment_input.type === 1) { // 2D texture from either image or webcam type
            glsl_code += "uniform sampler2D iInput" + i + ";";
        }
    }
    
    // inputs uniform from controllers
    for(ctrl_name in _controls) { 
        if (_controls.hasOwnProperty(ctrl_name)) {
           ctrl_obj = _controls[ctrl_name];

           glsl_code += "uniform " + ((ctrl_obj.comps !== undefined) ? ctrl_obj.type + ctrl_obj.comps : ctrl_obj.type) + " " + ctrl_name + ((ctrl_obj.count > 1) ? "[" + ctrl_obj.count + "]" : "") + ";";
        }
    }

    // add user fragment code
    glsl_code += _code_editor.getValue();

    frag = _createShader(_gl.FRAGMENT_SHADER, glsl_code);

    temp_program = _createAndLinkProgram(
            _createShader(_gl.VERTEX_SHADER, document.getElementById("vertex-shader").text),
            frag
        );

    if (temp_program) {
        _gl.deleteProgram(_program);
        
        _program = temp_program;
        
        _uniform_location_cache = {};
        
        _fail("");

        _clearCodeMirrorWidgets();

        _useProgram(_program);

        _gl.uniform2f(_gl.getUniformLocation(_program, "resolution"), _canvas.width, _canvas.height);
        
        _setUniforms(_gl, "vec", _program, "keyboard", _keyboard.data, _keyboard.data_components);
        
        // set uniforms to value from controllers
        for(ctrl_name in _controls) { 
            if (_controls.hasOwnProperty(ctrl_name)) {
                ctrl_obj = _controls[ctrl_name];
                
                _setUniforms(_gl, ctrl_obj.type, _program, ctrl_name, ctrl_obj.values, ctrl_obj.comps);
            }
        }

        position = _gl.getAttribLocation(_program, "position");
        _gl.enableVertexAttribArray(position);
        _gl.vertexAttribPointer(position, 2, _gl.FLOAT, false, 0, 0);
        
        if (_glsl_error) {
            _glsl_error = false;

            if (_fs_state === 0) {
                _play(false);   
            }
        }
    } else {
        _glsl_error = true;

        //_stop();
    }
};
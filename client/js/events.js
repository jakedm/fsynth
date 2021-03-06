/* jslint browser: true */

_user_name_element.addEventListener('click', function (e) {
        var user_name = prompt("User Name");

        if (user_name === null) {
            return;
        }

        if (user_name === "") {
            user_name = "Anonymous";
        }

        _user_name_element.innerHTML = user_name;

        localStorage.setItem('fs-user-name', user_name);

        _notification("User name change will take effect after page reload.");
    });

_canvas.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();

        WUI_CircularMenu.create(
            {
                x: _mx,
                y: _my,

                rx: 0,
                ry: 0,

                item_width:  32,
                item_height: 32
            },
            [
                { icon: "fs-plus-icon", tooltip: "Slice!",  on_click: function () {
                        _addPlayPositionMarker(_cx, 0, false, 1, true);
                    } }
            ]);

        return false;
    }, false);

document.addEventListener('mousedown', function (e) {
    var e = e || window.event;

    _cnmx = e.pageX / window.innerWidth;
    _cnmx = e.pageY / window.innerHeight;

    _mouse_btn = e.which;
});

document.getElementById("fs_select_editor_themes").addEventListener('change', function (e) {
    var theme = e.target.value;
    
    if (theme === "default") {
        theme = "seti";
    }
    
    _changeEditorTheme(theme);
});

document.addEventListener('mouseup', function (e) {
    _mouse_btn = 0;
});

document.addEventListener('mousemove', function (e) {
        var e = e || window.event,
            
            canvas_offset;

        canvas_offset = _getElementOffset(_canvas);

        _cx = e.pageX;
        _cy = e.pageY - canvas_offset.top;
    
        _cx = (_cx - canvas_offset.left - 1);

        _hover_freq = _getFrequency(_cy);

        if (_hover_freq !== null && (_cx >= 0 && _cx < _canvas_width)) {
            if (_xyf_grid) {
                if (_haxis_infos.style.display !== "block" ||
                    _vaxis_infos.style.display !== "block") {
                    _haxis_infos.style.display = "block";
                    _vaxis_infos.style.display = "block";
                }

                _haxis_infos.firstElementChild.innerHTML = _cy;
                _haxis_infos.lastElementChild.style.left = e.pageX + "px";
                _haxis_infos.lastElementChild.innerHTML = _truncateDecimals(_hover_freq + "", 2) + "Hz";
                _vaxis_infos.firstElementChild.innerHTML = _cx;

                _haxis_infos.style.top = _cy + "px";
                _vaxis_infos.style.left = e.pageX + "px";
            } else {
                _xy_infos.innerHTML = "x " + _cx + " y " + _cy;
                _hz_infos.innerHTML = " " + _truncateDecimals(_hover_freq + "", 2) + "Hz";
            }
        } else {
            if (_xyf_grid) {
                if (_haxis_infos.style.display !== "none" ||
                    _vaxis_infos.style.display !== "none") {
                    _haxis_infos.style.display = "none";
                    _vaxis_infos.style.display = "none";
                }
            } else {
                _xy_infos.innerHTML = "";
                _hz_infos.innerHTML = "";
            }
        }

        _mx = e.pageX;
        _my = e.pageY;

        if (_mouse_btn === _LEFT_MOUSE_BTN) {
            _nmx = e.pageX / window.innerWidth;
            _nmy = e.pageY / window.innerHeight;
        }
   });

document.getElementById("fs_ui_doc_btn").addEventListener("click", function () {
        window.open("https://www.fsynth.com/documentation", '_blank');
    });

document.getElementById("fs_ui_help_btn").addEventListener("click", function () {
        window.open("data/guide/fs.png", '_blank');
    });
/*
document.getElementById("fs_glsl_help_btn").addEventListener("click", function () {
        window.open("https://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf", '_blank');
    });
*/

var _on_window_resize = function () {
    _updateAllPlayPosition();
    
    _updateCodeView();
};

ResizeThrottler.initialize([_on_window_resize]);

_red_curtain_element.classList.add("fs-open-red-curtain");
_red_curtain_element.addEventListener("transitionend", function () {
        _red_curtain_element.parentElement.removeChild(_red_curtain_element);
    }, false);
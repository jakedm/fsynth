[![Fragment](https://www.fsynth.com/data/fs_screenshot_logo.png)](https://www.fsynth.com)

# [Fragment - The Collaborative Spectral Synthesizer](https://www.fsynth.com)

Source code repository for the Fragment app. which can be found at : https://www.fsynth.com

This is a web. spectral synthesizer powered by live [GLSL code](https://en.wikipedia.org/wiki/OpenGL_Shading_Language).

Fragment can also be used for live coding visuals, they can be synchronized to any audio using the MIDI capabilities AND also synchronized to the synthesized sound

This is a sort of [Shadertoy](https://www.shadertoy.com) like synthesizer, it is compatible with most shaders written for it.

## Feature list:

 * Full-blown additive synthesizer powered by WebAudio oscillators, a wavetable OR a native program written in C (fastest)
 * Live coding/JIT compilation of shader code
 * Real-time, collaborative app.
 * Stereophonic or monaural
 * Polyphonic
 * Multitimbral
 * Aliasing free
 * Adjustable audio output channel per slices
 * Feedback via framebuffer (for fx like reverb, delay, Release part of envelopes and more)
 * Shader inputs: webcam, textures and more to come
 * Real-time analysis (logarithmic spectrum view of the output etc.)
 * Native app. powered by [Electron](http://electron.atom.io/) with built-in [C powered additive synthesizer](https://github.com/grz0zrg/fas)
 * Per-sessions discussion system
 * Global and per sessions settings automatic saving/loading; make use of *localStorage*
 * No authentifications (make use of *localStorage* and is *sessions* based)

 Note: Blue component output of the fragment shader can be used for real-time sounds/visuals sync or visual feedback of functions/textures/camera, it is also possible to have full RGB output for visuals by turning on the "monophonic" setting

 Note: WebAudio oscillators and wavetable mode can only have two output channels (l/r) due to obvious performances issues (this may change in the future!)

## MIDI Feature list (Integrated MIDI support with the WebMIDI API):

 * Integrated note-on/note-off messages, note frequency, velocity, MIDI channel and elapsed time are accessible in the fragment shader (this is not shared between users)
 * Polyphony is automatically detected from the GPU capabilities (704 notes with a GeForce GTX 970 GPU, 16 notes is the minimum, maximum also depend on the shader complexity)
 * Hot plugging of MIDI devices are supported
 * MIDI enabled shader inputs

## Requirement:

 * Recent browser such as Chrome, Opera, Safari or Firefox (WebMIDI is still not supported by Firefox)
 * Recent medium GPU (Graphics Processing Unit), this app. was made and is used with a GeForce GTX 970
 * Recent medium multi-core CPU (a dual core should be ok with the native program, a beefy CPU is needed if you use more than one output channel), this is required for the audio synthesis part
 * Not necessary but a MIDI device such as a MIDI keyboard and a MIDI controller is recommended
 * Some friends to have fun with

## The project

 * client - main application
 * www - landing page
 * fss - main server (discuss. system, slices)
 * fsdb - sharedb server (collaborative features)
 * fsws - web. server (only used for development or local installation)
 * documentation - MAML (Minimalist Anubis Markup Language) with the latest HTML and PDF doc.
 * main.js - Electron app. file
 * common.js - Server config. file

 All the servers are clusterized for scalability and smooth updates.

## Build

Fragment is built with a custom build system watching for changes in real-time and which include files when it read /\*#include file\*/, it execute several programs on the output files such as code minifier for production ready usage, the build system was made with the functional *Anubis* programming language.

_app_fs.\*_ and _app_cm.\*_ are the entry point files used by the build system to produce a single file and a production ready file in the *dist* directory.

If you want to build it by yourself, you will have to find a way to run a pre-processor over _app_fs.\*_ and _app_cm.\*_ or implement other systems like requireJS!

## Prod. system

 * *prod_files* contain a list of files and directories that will be copied to the production system
 * *prod* is a shell script which produce an archive from *prod_files*, perform additional cleaning and unarchive over SSH
 * *setup* is a script which is executed on the server after everything has been uploaded and which configure Fragment for the production system

## How to setup your own

Fragment use MongoDB and Redis database, once those are installed, it is easy to run it locally:

 * clone this repository
 * cd fss & npm install & node fss
 * cd fsdb & npm install & node fsdb
 * cd fsws & npm install & node fsws
 * point your browser to http://127.0.0.1:3000

## Tips and tricks

 * If you enable the *monophonic* setting, you have the RGB output for live coding visuals which can be fully synchronized with the synthesized sounds which will be synthesized by using the alpha channel
 * Pressing F11 in the GLSL code editor trigger fullscreen editor

## Stuff used to make this

Client :
 * [Vanilla JS](http://vanilla-js.com/) yup!
 * [WUI](https://github.com/grz0zrg/wui) vanilla collection of UI widgets for the web
 * [CodeMirror](http://codemirror.net/) for the awesome editor and its addons/modes
 * [ShareDB](https://github.com/share/sharedb/) for the collaborative features
 * [Normalize](https://necolas.github.io/normalize.css/)
 * [Skeleton](http://getskeleton.com/) for the landing page

Servers :
 * [NodeJS](https://nodejs.org/en/)
 * [NGINX](https://www.nginx.com/)
 * [Flarum](http://flarum.org/)
 * [pm2](https://github.com/Unitech/pm2)
 * [MongoDB](https://www.mongodb.com)
 * [Redis](https://redis.io/)
 * [Winston](https://github.com/winstonjs/winston)
 * [Express](http://expressjs.com/)
 * [strong-cluster-control](https://github.com/strongloop/strong-cluster-control)

Utilities :
 * [FontAwesome](http://fontawesome.io/)
 * [fa2png](http://fa2png.io/)
 * [Brackets](http://brackets.io/)
 * [Atom](https://atom.io/)
 * [libwebsockets](https://libwebsockets.org/) for [fas](https://github.com/grz0zrg/fas)
 * [portaudio](http://www.portaudio.com/) for [fas](https://github.com/grz0zrg/fas)
 * [libflds](http://liblfds.org/) for [fas](https://github.com/grz0zrg/fas)
 * [SimpleScreenRecorder](http://www.maartenbaert.be/simplescreenrecorder/) for videos recording
 * [KDEnlive](https://kdenlive.org/) to edit the videos
 * [Geogebra](https://kdenlive.org/) for the logo
 * [Inkscape](https://www.inkscape.org) for the logo and some graphics
 * [GIMP](https://www.gimp.org/) some graphics
 * [The Anubis programming language](http://redmine.anubis-language.com/)
 * [Minimalist Anubis Markup Language](http://redmine.anubis-language.com/)

The repository for the early proof of concept can be found [here](https://github.com/grz0zrg/fs).

## Fragment on social medias

[Facebook](https://www.facebook.com/fsynth/)

[YouTube](https://www.youtube.com/channel/UC2CJFT1_ybPcTNlT6bVG0WQ)

[Twitter](https://twitter.com/fragmentsynth)

[SoundCloud](https://soundcloud.com/fsynth/)

## License

Simplified BSD license

## Credits

The biggest inspiration for all of this was [Alexander Zolotov Virtual ANS software](http://www.warmplace.ru/soft/ans/), thank to him.

Heavily inspired by [Shadertoy](https://www.shadertoy.com) as well.

For any questions, a message board is available [here](https://quiet.fsynth.com/)

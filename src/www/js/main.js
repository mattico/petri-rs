'use strict';

var game = {};

game.init = function() {
    window.onresize = onResize;
    
    var canvas = document.getElementById('canvas');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    if (canvas.getContext) {
        
        var dp = window.devicePixelRatio;
        
        var gl = canvas.getContext('webgl', {
            alpha: false,
            depth: false,
            stencil: false,
            antialias: true,
        });

        var vertex = getShader(gl, 'js/vertex.glsl', gl.VERTEX_SHADER);
        var fragment = getShader(gl, 'js/fragment.glsl', gl.FRAGMENT_SHADER);

        var program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            var info = gl.getProgramInfoLog(program);
            throw "Could not link WebGL shader. \n\n" + info;
        }

        gl.useProgram(program);
        
        // look up where the vertex data needs to go.
        var positionLocation = gl.getAttribLocation(program, "a_position");

        // Create a buffer and put a single clipspace rectangle in
        // it (2 triangles)
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER, 
            new Float32Array([
                -1.0, -1.0, 
                 1.0, -1.0, 
                -1.0,  1.0, 
                -1.0,  1.0, 
                 1.0, -1.0, 
                 1.0,  1.0]), 
            gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        game.draw(gl, 0);
        
    } else {
        console.log('No canvas support!');
    }
}

game.update = function(gl, time) {

}

game.draw = function(gl, time) {




    window.requestAnimationFrame(function(time) { game.draw(gl, time) });
}

function onResize() {
    var canvas = document.getElementById('canvas');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function getShader(gl, path, type) {
    var request = new XMLHttpRequest();
    request.open('GET', path, false);
    request.send();
    
    var shader = gl.createShader(type);
    
    gl.shaderSource(shader, request.responseText);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var info = gl.getShaderInfoLog(shader);
        throw "Could not compile WebGL shader. \n\n" + info;
    }

    return shader;
}
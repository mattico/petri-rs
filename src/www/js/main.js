'use strict';

var game = {
    lastTime: 0,
    players: [],
    gl: null,
    program: null,

    init: function() {
        window.onresize = onResize;

        onResize();

        if (canvas.getContext) {

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
                throw 'Could not link WebGL shader. \n\n' + info;
            }

            gl.useProgram(program);

            this.gl = gl;
            this.program = program;

            this.players.push(new Player(0, 'Matt', 'green', new Point(0, 0), 100));

            this.lastTime = performance.now();

            this.update(performance.now());

        } else {
            throw 'No canvas support!';
        }
    },

    update: function(time) {
        var dt = this.lastTime - time;
        this.lastTime = time;

        var gl = this.gl;
        var program = this.program;

        this.players.forEach(function(v) {
           v.update(dt);
           v.draw(gl, program); 
        });

        window.requestAnimationFrame(this.update.bind(this));
    }
};

function Point(x, y) {
    this.x = x;
    this.y = y;
    this.add = function(point) {
        return Point(this.x + point.x,
                     this.y + point.y);
    };
    this.sub = function(point) {
        return Point(this.x - point.x,
                     this.y - point.y);
    };
    this.distance = function(point) {
        return Math.sqrt(Math.pow(this.x - point.x, 2) +
                         Math.pow(this.y - point.y, 2));
    };
    this.clone = function() {
        return new Point(this.x, this.y);
    };
    this.as_array = function() {
        return [x, y];
    };
}

function Player(id, name, color, position, size) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.position = position;
    this.size = size;
    this.velocity = new Point(0, 0);
    this.blobs = [new Blob(this, size, position)];

    this.split = function() {
        b = [];
        this.blobs.forEach(function(v) {
            b.push.apply(v.split());
        });
        this.blobs = b;
    };

    this.update = function(dt) {
        this.blobs.forEach(function(v) {
            v.update(dt);
        })
    }

    this.draw = function(gl, program) {
        this.blobs.forEach(function(v) {
            v.draw(gl, program);
        })
    }
}

function Blob(player, size, position, velocity) {
    this.player = player;
    this.size = size;
    this.position = position;
    this.velocity = velocity || new Point(0, 0);

    this.radius = circleAreaToRadius(this.size);

    this.split = function() {
        return [new Blob(this.player, this.size / 2, this.position, this.velocity),
                new Blob(this.player, this.size / 2, this.position, this.velocity)];
    };

    this.update = function(dt) {
        this.radius = circleAreaToRadius(this.size);
    };

    this.draw = function(gl, program) {
        const ATTRIBUTES = 2;
        const numFans = 16;
        const degreePerFan = (2 * Math.PI) / numFans;
        var vertexData = [this.position.x, this.position.y];

        for(var i = 0; i <= numFans; i++) {
          var index = ATTRIBUTES * i + 2; // there is already 2 items in array
          var angle = degreePerFan * (i+1);
          vertexData[index] = this.position.x + Math.cos(angle) * this.radius;
          vertexData[index + 1] = this.position.y + Math.sin(angle) * this.radius;
        }

        var vertexDataTyped = new Float32Array(vertexData);

        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexDataTyped, gl.STATIC_DRAW);

        var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

        gl.enableVertexAttribArray(positionLocation);

        var positionLocation = gl.getAttribLocation(program, "a_position");
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexData.length/ATTRIBUTES);
    };
}

// Event Handlers
function onLoad() {
    game.init();
}

function onResize() {
    var canvas = document.getElementById('canvas');
    var dp = window.devicePixelRatio;
    
    canvas.width = window.innerWidth * dp;
    canvas.height = window.innerHeight * dp;
}


// Utilities
function getShader(gl, path, type) {
    var request = new XMLHttpRequest();
    request.open('GET', path, false);
    request.send();
    
    var shader = gl.createShader(type);
    
    gl.shaderSource(shader, request.responseText);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var info = gl.getShaderInfoLog(shader);
        throw 'Could not compile WebGL shader. \n\n' + info;
    }

    return shader;
}

function circleAreaToRadius(area) {
    return Math.sqrt(area / Math.PI);
}

function flattenPointArray(array) {
    var result = [];
    array.forEach(function(v) {
       result = result.concat(v.as_array()); 
    });
    return result;
}
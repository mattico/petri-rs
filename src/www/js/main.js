'use strict';

var game = {
    canvas: null,
    lastTime: 0,
    dt: 0,
    players: [],
    gl: null,
    program: null,
    mouse: new Point(0, 0),
    timeStep: 1000/60,
    fpsMeter: null,

    init: function(canvas) {
        this.canvas = canvas;

        canvas.addEventListener('mousemove', onMouseMove, false);
        canvas.addEventListener('resize', onResize, false);

        onResize();

        this.fpsMeter = new FPSMeter({ decimals: 0, graph: true, theme: 'dark', left: '5px' });

        if (canvas.getContext) {

            var gl = canvas.getContext('webgl', {
                alpha: false,
                depth: false,
                stencil: false,
                antialias: true,
            }) || canvas.getContext('experimental-webgl', {
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

            this.players.push(new Player(0, 'Matt', 'green', new Point(500, 500), 500));

            this.lastTime = performance.now();

            window.requestAnimationFrame(this.frame.bind(this));

        } else {
            throw 'No canvas support!';
        }
    },

    frame: function() {
        var time = performance.now();
        this.dt += Math.min(time - this.lastTime, 100);

        this.fpsMeter.tickStart();

        while (this.dt > this.timeStep) {
            this.dt -= this.timeStep;
            this.update(this.dt);
        }
        this.draw();
        this.lastTime = time;

        this.fpsMeter.tick();

        window.requestAnimationFrame(this.frame.bind(this));
    },

    update: function(dt) {      
        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;

        var gl = this.gl;
        var program = this.program;
        
        this.players.forEach(function(v) {
           v.update(dt);
        });
    },

    draw: function() {
        var gl = this.gl;
        var program = this.program;
        
        this.players.forEach(function(v) {
           v.draw(gl, program);
        });
    }
};


function Point(x, y) {
    this.x = x;
    this.y = y;
}

Point.prototype.add = function(point) {
    return new Point(this.x + point.x,
                     this.y + point.y);
};

Point.prototype.sub = function(point) {
    return new Point(this.x - point.x,
                     this.y - point.y);
};

Point.prototype.mul = function(val) {
    return new Point(this.x * val,
                     this.y * val);
}

Point.prototype.distance = function(point) {
    return Math.sqrt(Math.pow(this.x - point.x, 2) +
                     Math.pow(this.y - point.y, 2));
};

Point.prototype.direction = function(point) {
    return new Point(point.x - this.x, point.y - this.y);
}

Point.prototype.length = function() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
}

Point.prototype.unit = function() {
    return new Point(this.x / this.length(), this.y / this.length());
}

Point.prototype.clamp = function(max) {
    return this.length() < max ? this.clone() : this.mul(max / this.length());
}

Point.prototype.clone = function() {
    return new Point(this.x, this.y);
};

Point.prototype.as_array = function() {
    return [x, y];
};


function Player(id, name, color, position, size) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.position = position;
    this.size = size;
    this.blobs = [new Blob(this, size, position)];
}

Player.prototype.split = function() {
    b = [];
    this.blobs.forEach(function(v) {
        b.push.apply(v.split());
    });
    this.blobs = b;
};

Player.prototype.update = function(dt) {
    var size = 0;
    this.blobs.forEach(function(v) {
        v.update(dt);
        size += v.size;
    })
    this.size = size;
}

Player.prototype.draw = function(gl, program) {
    this.blobs.forEach(function(v) {
        v.draw(gl, program);
    })
}


function Blob(player, size, position, velocity) {
    this.areaMult = 50;
    this.player = player;
    this.size = size;
    this.position = position;
    this.velocity = velocity || new Point(0, 0);
    this.radius = circleAreaToRadius(this.size * this.areaMult);
}

Blob.prototype.split = function() {
    return [new Blob(this.player, this.size / 2, this.position, this.velocity),
            new Blob(this.player, this.size / 2, this.position, this.velocity)];
};

Blob.prototype.update = function(dt) {
    this.radius = circleAreaToRadius(this.size * this.areaMult);
    this.velocity = this.velocity.add(this.position.direction(game.mouse)).mul(.5 * dt * 1e-3).clamp(30);
    this.position = this.position.add(this.velocity.mul(dt));
};

Blob.prototype.draw = function(gl, program) {
    const attributes = 2;
    const numFans = 26;
    const degreePerFan = (2 * Math.PI) / numFans;
    var vertexData = [this.position.x, this.position.y];

    for (var i = 0; i <= numFans; i++) {
        var index = attributes * i + 2; // there is already 2 items in array
        var angle = degreePerFan * (i+1);
        vertexData[index] = this.position.x + Math.cos(angle) * this.radius;
        vertexData[index + 1] = this.position.y + Math.sin(angle) * this.radius;
    }

    var vertexDataTyped = new Float32Array(vertexData);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexDataTyped, gl.STATIC_DRAW);

    var fillLocation = gl.getUniformLocation(program, "u_fill");
    gl.uniform4f(fillLocation, 1.0, 0.0, 0.0, 0);

    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    gl.enableVertexAttribArray(positionLocation);

    var positionLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, attributes * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexData.length/attributes);
};


// Event Handlers
function onLoad() {
    var canvas = document.getElementById('canvas');
    game.init(canvas);
}

function onResize() {
    var canvas = document.getElementById('canvas');
    var dp = window.devicePixelRatio;
    
    canvas.width = window.innerWidth * dp;
    canvas.height = window.innerHeight * dp;
}

function onMouseMove(e) {
    game.mouse = new Point(e.clientX, e.clientY);
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
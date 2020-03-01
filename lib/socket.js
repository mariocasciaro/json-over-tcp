const net = require('net')
const EventEmitter = require('events').EventEmitter
const createProtocol = require('./protocol.js').create

exports.create = function (socketOrOptions) {
  return new Socket(socketOrOptions)
}

exports.connect = function () {
  return new Socket(net.connect.apply(void 0, arguments))
}

const Socket = exports.Socket = function (socketOrOptions) {
  const self = this

  if (socketOrOptions instanceof net.Socket) {
    this._socket = socketOrOptions
  } else {
    socketOrOptions = socketOrOptions || {}
    this._socket = new net.Socket(socketOrOptions)
  }

  this._emitter = new EventEmitter()
  this._protocol = createProtocol(this._socket)

  this._protocol.on('data', function (data) {
    self._emitter.emit('data', data)
  })

  this._protocol.on('error', function (err) {
    self._emitter.emit('error', err)
    self.end()
  });

  // Relay some of the socket events that don't need to be handled
  ['connect',
    'end',
    'close',
    'timeout',
    'drain',
    'error'
  ].forEach(function (event) {
    self._socket.on(event, function (data) {
      self._emitter.emit(event, data)
    })
  });

  // Relay some of the socket properties that don't need to be handled
  ['remoteAddress',
    'remotePort',
    'bytesRead',
    'bytesWritten',
    'bufferSize'
  ].forEach(function (propertyName) {
    Object.defineProperty(self, propertyName, {
      get: function () {
        return self._socket[propertyName]
      },
      enumerable: true
    })
  });

  // Relay some of the socket functions that don't need to be handled
  ['connect',
    'destroy',
    'pause',
    'resume',
    'setTimeout',
    'setNoDelay',
    'setKeepAlive',
    'address'
  ].forEach(function (functionName) {
    self[functionName] = function () {
      return self._socket[functionName].apply(self._socket, arguments)
    }
  })
}

Socket.prototype.write = function (data, callback) {
  this._protocol.write(data, callback)
}

Socket.prototype.end = function (data, callback) {
  if (data) {
    this.write(data, callback)
  }

  this._socket.end()
}

Socket.prototype.addListener = Socket.prototype.on = function () {
  return this._emitter.on.apply(this._emitter, arguments)
}

Socket.prototype.once = function () {
  return this._emitter.once.apply(this._emitter, arguments)
}

Socket.prototype.removeListener = function () {
  return this._emitter.removeListener.apply(this._emitter, arguments)
}

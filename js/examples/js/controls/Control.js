/**
 * @author arodic / http://akirodic.com/
 */

( function () {

  THREE.Control = function ( camera, domElement, target ) {

    this.camera = ( camera instanceof THREE.Camera ) ? camera : new THREE.Camera();

    this.domElement = ( domElement instanceof HTMLElement) ? domElement : document;

    this.target = ( target instanceof THREE.Vector3 ) ? target : new THREE.Vector3();

    // API

    this.enabled = true;

    // internal variables.

    var scope = this;
    var rect, touches, pointer;
    var pointers, pointersOld, pointerDeltas, closestPointer;

    // helper functions

    var getPointerVector = function ( x, y ) {
      rect = scope.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ( x - rect.left ) / rect.width * 2 - 1,
        1 - ( y - rect.top ) / rect.height * 2
      );
    }

    var getClosestPointer = function( point, array ) {
      closestPointer = array[ 0 ];
      for ( var i = 1; i < array.length; i++ ) {
        if ( array[ i ].distanceTo( point ) < closestPointer.distanceTo( point ) ) {
          closestPointer = array[ i ];
        }
      }
      return closestPointer;
    };

    this.getPointersFromEvent = function( event, reset ) {

      touches = event.touches ? event.touches : [event];

      pointersOld = reset ? [] : pointers || [];
      pointers = [];
      pointerDeltas = [];

      for ( var i = 0; i < touches.length; i++ ) {

        if ( touches[ i ].target === event.path[ 0 ] || event.touches === undefined ) {

          pointer = getPointerVector( touches[ i ].clientX, touches[ i ].clientY );
          pointers.push( pointer );

          if ( pointersOld[ pointers.length - 1 ] === undefined ) {

            pointersOld.push( pointer.clone() );

          }
        }

      }

      var data = [];

      for ( var i = 0; i < pointers.length; i++ ) {

        pointerDeltas[ i ] = pointers[ i ].clone().sub( getClosestPointer( pointers[ i ], pointersOld ) )
        data[ i ] = {
          position: pointers[ i ],
          previous: pointersOld[ i ],
          delta: pointerDeltas[ i ]
        }

      }

      return data;

    }

    // event handlers

    function onMouseDown( event ) {

      scope.setPointers( event, true );
      console.log( 'down', scope.pointers );

    }

    function onTouchstart( event ) {

      scope.setPointers( event, true );
      console.log( 'start', scope.pointers );

    }

    function onTouchmove( event ) {

      scope.setPointers( event );
      console.log( 'move', scope.pointerDeltas );

    }

    // initialize listeners

    this.addListeners = function ( element ) {

      element.addEventListener( 'mousedown', onMouseDown, false );
      element.addEventListener( 'touchstart', onTouchstart, false );
      element.addEventListener( 'touchmove', onTouchmove, false );

    };

    this.removeListeners = function ( element ) {

      element.removeEventListener( 'mousedown', onMouseDown, false );
      element.removeEventListener( 'touchstart', onTouchstart, false );
      element.removeEventListener( 'touchmove', onTouchmove, false );

    };

  };

  THREE.Control.prototype = {

    constructor: THREE.Control,

    addListeners: function () {},

    removeListeners: function () {},

    dispose: function() {

      this.camera = null;
      this.target = null;
      this.domElement = null;

    },

    onCameraChange: function ( callback ) {

      this.onCameraChangeCallback = callback;

      return this;

    },

    onCameraChangeCallback: function () {},

    onDomElementChange: function ( callback ) {

      this.onDomElementChangeCallback = callback;

      return this;

    },

    onDomElementChangeCallback: function ( domElement, oldDomElement ) {

      if ( oldDomElement ) {

        setTimeout(function () {

          this.removeListeners( oldDomElement );

        }.bind(this));

      }

      if ( domElement ) {

        setTimeout(function () {

          this.addListeners( domElement );

        }.bind(this));

      }

    },

    onTargetChange: function ( callback ) {

      this.onTargetChangeCallback = callback;

      return this;

    },

    onTargetChangeCallback: function () {}

  };

  THREE.EventDispatcher.prototype.apply( THREE.Control.prototype );

  Object.defineProperties( THREE.Control.prototype, {

    camera: {

      get: function () {

        return this._camera;

      },

      set: function ( camera ) {

        var oldCamera = this._camera;
        this._camera = camera;

        window.clearTimeout(this._cameraSetTimeout);
        this._cameraSetTimeout = setTimeout(function () {

          this.onCameraChangeCallback( camera, oldCamera );
          delete this._cameraSetTimeout;

        }.bind(this));

      }

    },

    domElement: {

      get: function () {

        return this._domElement;

      },

      set: function ( domElement ) {

        var oldDomElement = this._domElement;
        this._domElement = domElement;

        window.clearTimeout(this._domElementSetTimeout);
        this._domElementSetTimeout = setTimeout(function () {

          this.onDomElementChangeCallback( domElement, oldDomElement );
          delete this._domElementSetTimeout;

        }.bind(this));

      }

    },

    target: {

      get: function () {

        return this._target;

      },

      set: function ( target ) {

        var oldTarget = this._target;
        this._target = target;

        window.clearTimeout(this._targetSetTimeout);
        this._targetSetTimeout = setTimeout(function () {

          this.onTargetChangeCallback( target, oldTarget );
          delete this._targetSetTimeout;

        }.bind(this));

      }

    }

  } );

}());

/**
 * @author arodic / http://akirodic.com/
 */

( function () {

  // shared variables

  var rect, pointersOld = [];

  THREE.Control = function ( camera, domElement, target ) {

    this.camera = ( camera instanceof THREE.Camera ) ? camera : new THREE.Camera();

    this.domElement = ( domElement instanceof HTMLElement) ? domElement : document;

    this.target = ( target instanceof THREE.Vector3 ) ? target : new THREE.Vector3();

    // API

    this.enabled = true;

    // pointers are expressed in -1 to 1 coordinate space relative to domElement.

    this.pointers = [];
    this.pointersDelta = [];

    // internal variables

    var scope = this;

    // event handlers

    function onMouseDown( event ) {

      scope.setPointers(event);
      console.log('down', scope.pointers);

    }

    function onTouchstart( event ) {

      scope.setPointers(event);
      console.log('start', scope.pointers);

    }

    function onTouchmove( event ) {

      scope.setPointers(event);
      console.log('move', scope.pointersDelta);

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

  // hepler functions

  var getClosestPoint = function( point, pointArray ) {

    return ( pointArray.length > 1 && pointArray[ 0 ].distanceTo( point) < pointArray[ 1 ].distanceTo( point) ) ? pointArray[ 0 ] : pointArray[ 1 ];

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

    onTargetChangeCallback: function () {},

    setPointers: function( event ) {

      rect = this.domElement.getBoundingClientRect();

      this.pointers = [];
      this.pointersDelta = [];

      var makePointer = function (clientX, clientY) {
        return new THREE.Vector2(
          ( clientX - rect.left ) / rect.width * 2 - 1,
          ( clientY - rect.top ) / rect.height * 2 - 1
        );
      }

      if ( event.touches ) {

        for ( var i = 0; i < event.touches.length; i++ ) {

          if ( event.touches[ i ].target === event.path[ 0 ] ) {

            this.pointers.push( makePointer( event.touches[ i ].pageX, event.touches[ i ].pageY ) );

          }

        }

      } else {

        this.pointers.push( makePointer( event.clientX, event.clientY ) );

      }

      pointersOld.length = Math.min(pointersOld.length, this.pointers.length);

      for (var i = pointersOld.length; i < this.pointers.length; i++) {

        pointersOld.push( this.pointers[i].clone() );

      }

      switch ( this.pointers.length ) {

        case 1:
          // pointersDelta[ 0 ].subVectors( pointers[ 0 ], getClosestPoint( pointers[ 0 ], pointersOld ) );
          this.pointersDelta.push(
              this.pointers[ 0 ].clone().sub( getClosestPoint( this.pointers[ 0 ], pointersOld ) ) );
          // console.log(pointersDelta[ 0 ])
          break;

        case 2:
          // pointersDelta[ 0 ].subVectors( pointers[ 0 ], getClosestPoint( pointers[ 0 ], pointersOld ) );
          // pointersDelta[ 1 ].subVectors( pointers[ 1 ], getClosestPoint( pointers[ 1 ], pointersOld ) );
          break;
      }

      pointersOld = this.pointers;

    }

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

/**
 * @author arodic / http://akirodic.com/
 */

( function () {

  // Element to be added to body during a drag gesture.
  // It prevents other elements from recieving events and stopping propagaion.
  var clickmask = document.createElement( 'div' );
  clickmask.className = 'three-control';
  clickmask.style.position = 'fixed';
  clickmask.style.top = 0;
  clickmask.style.left = 0;
  clickmask.style.bottom = 0;
  clickmask.style.right = 0;
  clickmask.style.zIndex = 10000000;
  clickmask.style.cursor = 'move';
  // clickmask.style.background = 'rgba(0,255,255,0.2)';

  THREE.Control = function () {

    // internal variables.

    this._properties = {};
    this._effects = {};
    this._targetEffects = {};

    this.registerProperties( {
      domElement: {
        type: HTMLElement,
        notify: true
      },
      camera: {
        type: THREE.Camera,
        notify: true
      },
      scene: {
        type: THREE.Scene,
        notify: true
      },
      selection: {
        type: THREE.Selection,
        observer: 'selectionChanged',
        notify: true
      },
      active: {
        value: false,
        type: 'boolean',
        notify: true
      },
      enabled: {
        value: true,
        type: 'boolean',
        notify: true
      }
    } );

    var scope = this;
    var pointers;
    var rect, touches, pointer;
    var positions, positionsStart, positionsOld, positionDeltas, closestPointer;
    var preventTouchmove = false;

    // helper functions

    var getPointerVector = function ( x, y ) {
      rect = scope.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ( x - rect.left ) / rect.width * 2 - 1,
        1 - ( y - rect.top ) / rect.height * 2
      );
    };

    var getClosestPointer = function ( point, array ) {
      closestPointer = array[ 0 ];
      for ( var i = 1; i < array.length; i++ ) {
        if ( array[ i ].distanceTo( point ) < closestPointer.distanceTo( point ) ) {
          closestPointer = array[ i ];
        }
      }
      return closestPointer;
    };

    this.getPointersFromEvent = function ( event, reset ) {

      touches = event.touches ? event.touches : [ event ];

      positionsOld = reset ? [] : positions || [];
      positionsStart = reset ? [] : positionsStart || [];
      positions = [];
      positionDeltas = [];
      positionOffsets = [];

      for ( var i = 0; i < touches.length; i++ ) {

        if ( touches[ i ].target === event.path[ 0 ] || event.touches === undefined ) {

          pointer = getPointerVector( touches[ i ].clientX, touches[ i ].clientY );
          positions.push( pointer );

          if ( positionsOld[ positions.length - 1 ] === undefined ) {

            positionsOld.push( pointer.clone() );

          }

          if ( positionsStart[ positions.length - 1 ] === undefined ) {

            positionsStart.push( pointer.clone() );

          }

        }

      }

      var data = [];

      for ( i = 0; i < positions.length; i++ ) {

        positionDeltas[ i ] = positions[ i ].clone().sub( getClosestPointer( positions[ i ], positionsOld ) );
        positionOffsets[ i ] = positions[ i ].clone().sub( getClosestPointer( positions[ i ], positionsStart ) );
        data[ i ] = {
          position: positions[ i ],
          previous: positionsOld[ i ], // TODO: remove
          delta: positionDeltas[ i ],
          offset: positionOffsets[ i ]
        };

      }

      return data;

    };

    function onMousedown ( event ) {

      if ( scope.enabled === false ) return;

      pointers = scope.getPointersFromEvent( event, true );

      if ( typeof scope.onTrackstart === 'function' ) {

        scope.onTrackstart( event, pointers );

      }

      window.addEventListener( 'mousemove', onMousemove );
      window.addEventListener( 'mouseup', onMouseup );

    }

    function onMousemove ( event ) {

      if ( scope.enabled === false ) return;

      pointers = scope.getPointersFromEvent( event );

      if ( typeof scope.onTrack === 'function' ) {

        scope.onTrack( event, pointers );

      }

      if ( clickmask.parentNode !== document.body ) {

        document.body.appendChild( clickmask );

      }

    }

    function onMouseup ( event ) {

      if ( scope.enabled === false ) return;

      pointers = scope.getPointersFromEvent( event );

      if ( typeof scope.onTrackend === 'function' ) {

        scope.onTrackend( event, pointers );

      }

      window.removeEventListener( 'mousemove', onMousemove );
      window.removeEventListener( 'mouseup', onMouseup );

      if ( clickmask.parentNode == document.body ) {

        document.body.removeChild( clickmask );

      }

    }

    function onHover ( event ) {

      if ( scope.enabled === false ) return;

      pointers = scope.getPointersFromEvent( event );

      if ( typeof scope.onHover === 'function' ) {

        scope.onHover( event, pointers );

      }

    }

    function onTouchstart ( event ) {

      event.preventDefault();

      scope.domElement.focus();

      if ( scope.enabled === false ) return;

      preventTouchmove = true;

      setTimeout( function () {

        preventTouchmove = false;

      } );

      pointers = scope.getPointersFromEvent( event, true );

      if ( typeof scope.onHover === 'function' ) {

        scope.onHover( event, pointers );

      }

      if ( typeof scope.onTrackstart === 'function' ) {

        scope.onTrackstart( event, pointers );

      }

      scope.domElement.addEventListener( 'touchmove', onTouchmove );
      scope.domElement.addEventListener( 'touchend', onTouchend );

    }

    function onTouchmove ( event ) {

      event.preventDefault();

      if ( scope.enabled === false ) return;

      if ( preventTouchmove === true ) return;

      pointers = scope.getPointersFromEvent( event );

      if ( typeof scope.onTrack === 'function' ) {

        scope.onTrack( event, pointers );

      }

    }

    function onTouchend ( event ) {

      event.preventDefault();

      if ( scope.enabled === false ) return;

      if ( typeof scope.onTrackend === 'function' ) {

        scope.onTrackend( event, pointers );

      }

      scope.domElement.removeEventListener( 'touchmove', onTouchmove );
      scope.domElement.removeEventListener( 'touchend', onTouchend );

    }

    function onMousewheel ( event ) {

      event.preventDefault();

      if ( scope.enabled === false ) return;

      delta = 0;

      if ( event.wheelDelta ) {

        delta = - event.wheelDelta;

      } else if ( event.detail ) {

        delta = event.detail * 10;

      }

      if ( typeof scope.onMousewheel === 'function' ) {

        scope.onMousewheel( event, delta );

      }

    }

    function onKeyup ( event ) {

      if ( scope.enabled === false ) return;

      if ( typeof scope.onKeyup === 'function' ) scope.onKeyup( event, event.which );

    };

    function onContextmenu ( event ) {

      event.preventDefault();

      if ( scope.enabled === false ) return;

      if ( typeof scope.onContextmenu === 'function' ) scope.onContextmenu( event );

    };

    // this.onKeyup = function ( event, key ) { console.log('onKeyup'); };
    // this.onContextmenu = function ( event, pointers ) { console.log('onContextmenu'); };
    // this.onTrackstart = function ( event, pointers ) { console.log('onTrackstart'); };
    // this.onMousewheel = function ( event, delta ) { console.log('onMousewheel'); };
    // this.onTrack = function ( event, pointers ) { console.log('onTrack'); };
    // this.onTrackend = function ( event, pointers ) { console.log('onTrackend'); };

    this.addEventListener( 'domelementchange', function ( event ) {

      if ( event.value ) {

        event.value.addEventListener( 'mousedown', onMousedown );
        event.value.addEventListener( 'touchstart', onTouchstart );
        event.value.addEventListener( 'mousewheel', onMousewheel );
        event.value.addEventListener( 'DOMMouseScroll', onMousewheel ); // firefox
        event.value.addEventListener( 'mousemove', onHover );
        event.value.addEventListener( 'keyup', onKeyup );
        event.value.addEventListener( 'contextmenu', onContextmenu );

      }

      if ( event.oldValue ) {

        event.oldValue.removeEventListener( 'mousedown', onMousedown );
        event.oldValue.removeEventListener( 'touchstart', onTouchstart );
        event.oldValue.removeEventListener( 'mousewheel', onMousewheel );
        event.oldValue.removeEventListener( 'DOMMouseScroll', onMousewheel ); // firefox
        event.oldValue.removeEventListener( 'mousemove', onHover );
        event.oldValue.removeEventListener( 'keyup', onKeyup );
        event.oldValue.removeEventListener( 'contextmenu', onContextmenu );

      }

    } );

  };

  THREE.EventDispatcher.prototype.apply( THREE.Control.prototype );

  THREE.Control.prototype.registerProperty = function ( key, value, type, observer, notify ) {

    var _changeEvent = key.toLowerCase() + 'change';
    var _oldValue;

    if ( !this.hasOwnProperty(key) ) {

      Object.defineProperty( this, key, {

        get: function () {

          return this._properties[ key ];

        },

        set: function ( value ) {

          if ( this._properties[ key ] === value ) return;

          if ( type && value !== undefined ) {

            if ( typeof type === 'string' && typeof value !== type ) {

              console.warn('THREE.Control: ' + key + ' is incorrect type.');
              return;

            } else if ( typeof type === 'function' && !( value instanceof type ) ) {

              console.warn('THREE.Control: ' + key + ' is incorrect type.');
              return;

            }

          }

          _oldValue = this._properties[ key ];
          this._properties[ key ] = value;

          if ( notify || observer || this._effects[ _changeEvent ] || this._targetEffects[ _changeEvent ] ) {

            this.debounce( _changeEvent, function () {

              this.dispatchEvent( { type: _changeEvent, value: value, oldVaue: _oldValue } );

            }.bind( this ));

            this.dispatchChangeEvent();

          }

        }

      } );

    }

    if ( observer && typeof this[ observer ] == 'function') {

      this.addEventListener( _changeEvent, this[ observer ] );

    }

    this[ key ] = value;

  };

  THREE.Control.prototype.registerProperties = function ( properties ) {

    for ( var key in properties ) {

      this.registerProperty(
        key,
        properties[ key ].value,
        properties[ key ].type,
        properties[ key ].observer,
        properties[ key ].notify
      );

    }

  };

  THREE.Control.prototype.bindProperty = function ( key, target, targetkey ) {

    var _changeEvent = key.toLowerCase() + 'change';
    var _targetChangeEvent = targetkey.toLowerCase() + 'change';

    this._effects[ _changeEvent ] =  function () { target[ targetkey ] = this[ key ]; }.bind( this );
    this._targetEffects[ _targetChangeEvent ] =   function () { this[ key ] = target[ targetkey ]; }.bind( this ),

    this.addEventListener( _changeEvent, this._effects[ _changeEvent ] );
    target.addEventListener( _targetChangeEvent, this._targetEffects[ _targetChangeEvent ] );

    target[ targetkey ] = this[ key ];

  };

  THREE.Control.prototype.dispose = function () {

    var id;

    if (this._effects) {
      for ( id in _effects ) {
        this.removeEventListener( id, _effects[ id ] );
        delete this._effects[ id ];
      }
    }

    if (this._targetEffects) {
      for ( id in _targetEffects ) {
        this.removeEventListener( id, _targetEffects[ id ] );
        delete this._targetEffects[ id ];
      }
    }

    if (this._properties) {
      for ( var key in this._properties ) {
        delete this._properties[ key ];
      }
    }

    if (this._debouncers) {
      for ( id in this._debouncers ) {
        window.clearTimeout( this._debouncers[ id ] );
        delete this._debouncers[ id ];
      }
    }

  };

  THREE.Control.prototype.debounce = function ( id, callback, timeout ) {

    this._debouncers = this._debouncers || {};

    window.clearTimeout( this._debouncers[ id ] );

    this._debouncers[ id ] = setTimeout( function () {

      callback();
      delete this._debouncers[ id ];

    }.bind( this ), timeout );

  };

  THREE.Control.prototype.dispatchChangeEvent = function ( id, callback, timeout ) {

    this.debounce( 'change', function () {

      this.dispatchEvent( { type: 'change' } );

    }.bind( this ));

  };

  THREE.Control.prototype.selectionChanged = function ( event ) {

    this._selectionEvent = this._selectionEvent || function () {

      this.debounce( 'selection', function () {

        this.dispatchEvent( { type: 'selection' } );

      }.bind( this ));

      this.dispatchChangeEvent();

    }.bind( this );

    if ( event.oldValue ) event.oldValue.removeEventListener( 'change', this._selectionEvent );

    if ( event.value ) event.value.addEventListener( 'change', this._selectionEvent );

  };

}());

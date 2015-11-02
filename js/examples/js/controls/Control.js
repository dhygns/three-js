/**
 * @author arodic / http://akirodic.com/
 */

( function () {

  THREE.Control = function () {

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

      for ( i = 0; i < pointers.length; i++ ) {

        pointerDeltas[ i ] = pointers[ i ].clone().sub( getClosestPointer( pointers[ i ], pointersOld ) );
        data[ i ] = {
          position: pointers[ i ],
          previous: pointersOld[ i ],
          delta: pointerDeltas[ i ]
        };

      }

      return data;

    };


  };

  THREE.EventDispatcher.prototype.apply( THREE.Control.prototype );

  THREE.Control.prototype.registerProperty = function ( key, value, type, observer, notify ) {

    this._properties = this._properties || {};

    var _changeEvent = key.toLowerCase() + 'change';
    var _oldValue;

    Object.defineProperty( this, key, {

      get: function () {

        return this._properties[ key ];

      },

      set: function ( value ) {

        if ( this._properties[ key ] === value ) return;

        if ( type ) {

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

        if ( notify !== true ) return;

        this.debounce( _changeEvent, function () {

          if ( observer && typeof this[ observer ] == 'function') {

            this[ observer ]( value, _oldValue );

          }

          this.dispatchEvent( { type: _changeEvent, value: value, oldVaue: _oldValue } );

        }.bind(this));

      }

    } );

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

    this._effects = this._effects || {};

    var id = key.toLowerCase() + 'change';
    var targetId = targetkey.toLowerCase() + 'change';

    this._effects[ id ] = {
      sourceChangeCallback: function () { target[ targetkey ] = this[ key ]; }.bind( this ),
      targetChangeCallback: function () { this[ key ] = target[ targetkey ]; }.bind( this ),
      target: target
    }

    this.addEventListener( id, this._effects[ id ].sourceChangeCallback );
    target.addEventListener( targetId, this._effects[ id ].targetChangeCallback );

    target[ targetkey ] = this[ key ];

  };

  THREE.Control.prototype.dispose = function () {

    if (this._effects) {
      for ( var id in _effects ) {
        this.removeEventListener( id, _effects[ id ].sourceChangeCallback );
        this._effects[ id ].target.removeEventListener( id, this._effects[ id ].targetChangeCallback );
        delete this._effects[ id ];
      }
      delete this._effects;
    }

    if (this._properties) {
      for ( var key in this._properties ) {
        delete this._properties[ key ];
      }
      delete this._properties;
    }

    if (this._debouncers) {
      for ( var id in this._debouncers ) {
        window.clearTimeout( this._debouncers[ id ] );
        delete this._debouncers[ id ];
      }
      delete this._debouncers;
    }

  };

  THREE.Control.prototype.debounce = function ( id, callback, timeout ) {

    this._debouncers = this._debouncers || {};

    window.clearTimeout( this._debouncers[ id ] );

    this._debouncers[ id ] = setTimeout( function () {

      callback();
      delete this._debouncers[ id ];

    }.bind(this), timeout );

  };

}());

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author arodic / http://akirodic.com/
 */

( function () {

  'use strict';

  // shared variables

  var vector = new THREE.Vector3();
  var matrix = new THREE.Matrix3();
  var box = new THREE.Box3();
  var pointerStart;

  var EPS = 0.000001;
  var theta, phi, rect, radius, distance, fovFactor;
  var cw, ch, aspect, delta, center, scale, minCenter, maxCenter;

  // Element to be added to body during a drag gesture.
  // It prevents other elements from recieving events and stopping propagaion.
  var clickmask = document.createElement( 'div' );
  clickmask.style.position = 'fixed';
  clickmask.style.top = 0;
  clickmask.style.left = 0;
  clickmask.style.bottom = 0;
  clickmask.style.right = 0;
  clickmask.style.zIndex = 10000000;
  clickmask.style.cursor = 'move';
  // clickmask.style.background = 'rgba(255,0,0,0.05)';

  var changeEvent = { type: 'change' };

  THREE.ViewportControl = function ( camera, domElement, target, selection ) {

    THREE.Control.call( this );

    this.registerProperties( {
      camera: {
        value: camera,
        type: THREE.Camera,
        notify: true
      },
      domElement: {
        value: domElement,
        type: HTMLElement,
        notify: true
      },
      target: {
        value: target,
        type: THREE.Vector3,
        notify: true
      },
      selection: {
        value: selection,
        type: THREE.Selection,
        notify: true
      },
      enabled: {
        value: true,
        type: 'boolean',
        notify: true
      },
    } );

    // internal variables

    var scope = this;

    var STATE = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2 };
    var state = STATE.NONE;
    var pointers;

    // event handlers

    function onMousedown( event ) {

      if ( scope.enabled === false ) return;

      if ( event.button === 0 ) {

        state = STATE.ROTATE;

        if ( scope.camera instanceof THREE.OrthographicCamera ) {

          state = STATE.PAN;

        }

      } else if ( event.button === 1 ) {

        state = STATE.ZOOM;

      } else if ( event.button === 2 ) {

        state = STATE.PAN;

      }

      pointers = scope.getPointersFromEvent( event, true );

      pointerStart = pointers[ 0 ].position;

      window.addEventListener( 'mousemove', onMousemove );
      window.addEventListener( 'mouseup', onMouseup );
      window.addEventListener( 'contextmenu', onContextmenu );

    }

    function onMousemove( event ) {

      if ( scope.enabled === false ) return;

      pointers = scope.getPointersFromEvent( event );

      if ( state === STATE.ROTATE ) {

        scope.rotate( pointers[ 0 ].delta );

      } else if ( state === STATE.ZOOM ) {

        scope.zoom( pointers[ 0 ].delta );

      } else if ( state === STATE.PAN ) {

        scope.pan( pointers[ 0 ].delta );

      }

      if ( pointerStart.distanceTo( pointers[ 0 ].position ) > 0.1 ) {

        if ( clickmask.parentNode !== document.body ) {
          document.body.appendChild(clickmask);
        }

      }

    }

    function onMouseup( event ) {

      state = STATE.NONE;

      if (clickmask.parentNode == document.body) {
        document.body.removeChild(clickmask);
      }

      window.removeEventListener( 'mousemove', onMousemove );
      window.removeEventListener( 'mouseup', onMouseup );
      window.addEventListener( 'contextmenu', onContextmenu );

    }

    function onMousewheel( event ) {

      if ( scope.enabled === false ) return;

      event.preventDefault();

      delta = 0;

      if ( event.wheelDelta ) {

        // WebKit / Opera / Explorer 9

        delta = - event.wheelDelta;

      } else if ( event.detail ) {

        // Firefox

        delta = event.detail * 10;

      }

      scope.zoom( new THREE.Vector2( 0, delta / 1000 ) );

    }

    function onTouchstart( event ) {

      if ( scope.enabled === false ) return;

      event.preventDefault();

      pointers = scope.getPointersFromEvent( event, true );

      scope.domElement.addEventListener( 'touchmove', onTouchmove );
      scope.domElement.addEventListener( 'touchend', onTouchend );

    }

    function onTouchmove( event ) {

      if ( scope.enabled === false ) return;

      event.preventDefault();

      pointers = scope.getPointersFromEvent( event );

      switch ( pointers.length ) {

        case 1:

          if ( scope.camera instanceof THREE.PerspectiveCamera ) {

            scope.rotate( pointers[ 0 ].delta );

          } else if ( scope.camera instanceof THREE.OrthographicCamera ) {

            scope.pan( pointers[ 0 ].delta );

          }
          break;

        case 2:

          var prevDistance = pointers[ 0 ].previous.distanceTo( pointers[ 1 ].previous );
          var distance = pointers[ 0 ].position.distanceTo( pointers[ 1 ].position );

          if ( prevDistance ) {

            scope.zoom( new THREE.Vector2(0, prevDistance - distance ) );
            scope.pan( pointers[ 0 ].delta.clone().add( pointers[ 1 ].delta ).multiplyScalar(0.5) );

          }
          break;
      }

    }

    function onTouchend() {

      event.preventDefault();

      scope.domElement.removeEventListener( 'touchmove', onTouchmove );
      scope.domElement.removeEventListener( 'touchend', onTouchend );

    }

    function onKeyup(event) {

      if ( event.which === 70 ) {

        scope.focusSelection();

      }

    }

    function onContextmenu( event ) {

      event.preventDefault();

    }

    this.addEventListener( 'domelementchange', function ( event ) {

      if ( event.value ) {

        event.value.addEventListener( 'mousedown', onMousedown );
        event.value.addEventListener( 'mousewheel', onMousewheel );
        event.value.addEventListener( 'DOMMouseScroll', onMousewheel ); // firefox
        event.value.addEventListener( 'touchstart', onTouchstart );
        event.value.addEventListener( 'keyup', onKeyup );
        event.value.addEventListener( 'contextmenu', onContextmenu );

      }

      if ( event.oldValue ) {

        event.oldValue.removeEventListener( 'mousedown', onMousedown );
        event.oldValue.removeEventListener( 'mousewheel', onMousewheel );
        event.oldValue.removeEventListener( 'DOMMouseScroll', onMousewheel ); // firefox
        event.oldValue.removeEventListener( 'touchstart', onTouchstart );
        event.oldValue.removeEventListener( 'keyup', onKeyup );
        event.oldValue.removeEventListener( 'contextmenu', onContextmenu );

      }

    } );

  };

  THREE.ViewportControl.prototype = Object.create( THREE.Control.prototype );
  THREE.ViewportControl.prototype.constructor = THREE.ViewportControl;

  THREE.ViewportControl.prototype.rotate = function ( delta ) {

    vector.copy( this.camera.position ).sub( this.target );

    theta = Math.atan2( vector.x, vector.z );
    phi = Math.atan2( Math.sqrt( vector.x * vector.x + vector.z * vector.z ), vector.y );
    rect = this.domElement.getBoundingClientRect();

    // Denormalize rotation ammount;
    theta -= delta.x * rect.width * 0.005;
    phi -= - delta.y * rect.height * 0.005;

    phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

    radius = vector.length();

    vector.x = radius * Math.sin( phi ) * Math.sin( theta );
    vector.y = radius * Math.cos( phi );
    vector.z = radius * Math.sin( phi ) * Math.cos( theta );

    this.camera.position.copy( this.target ).add( vector );

    this.camera.lookAt( this.target );

    this.dispatchEvent( changeEvent );

  };

  THREE.ViewportControl.prototype.pan = function ( delta ) {

    distance = this.camera.position.distanceTo( this.target );

    vector.set( - delta.x, - delta.y, 0 );

    if ( this.camera instanceof THREE.PerspectiveCamera ) {

      fovFactor = distance * Math.tan( ( this.camera.fov / 2 ) * Math.PI / 180.0 );
      vector.multiplyScalar( fovFactor );
      vector.x *= this.camera.aspect;

    } else if ( this.camera instanceof THREE.OrthographicCamera ) {

      vector.x *= ( this.camera.right - this.camera.left ) / 2;
      vector.y *= ( this.camera.top - this.camera.bottom ) / 2;

    }

    vector.applyMatrix3( matrix.getNormalMatrix( this.camera.matrix ) );
    this.camera.position.add( vector );
    this.target.add( vector );

    this.dispatchEvent( changeEvent );

  };

  THREE.ViewportControl.prototype.zoom = function ( delta ) {

    if ( this.camera instanceof THREE.PerspectiveCamera ) {

      var distance = this.camera.position.distanceTo( this.target );

      vector.set( 0, 0, delta.y );

      vector.multiplyScalar( distance );

      if ( vector.length() > distance ) return;

      vector.applyMatrix3(matrix.getNormalMatrix( this.camera.matrix ) );

      this.camera.position.add( vector );

    } else if ( this.camera instanceof THREE.OrthographicCamera ) {

      this.camera.top *= 1 + delta.y;
      this.camera.right *= 1 + delta.y;
      this.camera.bottom *= 1 + delta.y;
      this.camera.left *= 1 + delta.y;

    }

    this.dispatchEvent( changeEvent );

  };

  THREE.ViewportControl.prototype.focusSelection = function () {

    if ( this.selection && this.selection.objects.length ) {

      if ( this.selection.sphere.radius ) {

        var radius = this.selection.sphere.radius;
        var offset = this.camera.position.clone().sub( this.target );

        if ( this.camera instanceof THREE.PerspectiveCamera ) {

          this.target.copy( this.selection.center );

          var fovFactor = Math.tan( ( this.camera.fov / 2 ) * Math.PI / 180.0 );
          offset.normalize().multiplyScalar( radius  / fovFactor );

          this.camera.position.copy( this.target ).add( offset );

          this.camera.lookAt( this.target );

        } else if ( this.camera instanceof THREE.OrthographicCamera ) {

          this.target.copy( this.selection.center );
          this.camera.position.copy( this.target ).add( offset );

          cw = this.camera.right - this.camera.left;
          ch = this.camera.top - this.camera.bottom;
          aspect = cw / ch;

          if ( aspect < 1 ) {

            this.camera.top = radius / aspect;
            this.camera.right = radius;
            this.camera.bottom = -radius / aspect;
            this.camera.left = -radius;

          } else {

            this.camera.top = radius;
            this.camera.right = radius * aspect;
            this.camera.bottom = -radius;
            this.camera.left = -radius * aspect;

          }

        }

        this.dispatchEvent( changeEvent );

      }

    }

  };

}());

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author arodic / http://akirodic.com/
 */

/* global THREE, console */

( function () {

  'use strict';

  // shared variables

  var vector = new THREE.Vector3();
  var matrix = new THREE.Matrix3();

  var EPS = 0.000001;
  var theta, phi, rect, radius, distance, fovFactor;
  var cw, ch, aspect, delta;

  var changeEvent = { type: 'change' };

  // Element to be added to body during a drag gesture.
  // It prevents other elements from recieving events and stopping propagaion.
  var clickmask = document.createElement( 'div' );
  clickmask.style.position = 'fixed';
  clickmask.style.top = 0;
  clickmask.style.left = 0;
  clickmask.style.bottom = 0;
  clickmask.style.right = 0;
  clickmask.style.zIndex = 10000000;

  THREE.EditorControls = function ( camera, domElement, target ) {

    THREE.Control.call( this );

    if ( !( camera instanceof THREE.Camera ) ) {
      console.warn('THREE.EditorControls requires an instance THREE.Camera')
      return;
    }

    this.camera = ( camera instanceof THREE.Camera ) ? camera : new THREE.Camera();

    this.domElement = ( domElement instanceof HTMLElement) ? domElement : document;

    this.target = ( target instanceof THREE.Vector3 ) ? target : new THREE.Vector3();

    // API

    this.enabled = true;

    // internal variables

    var scope = this;

    var STATE = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2 };
    var state = STATE.NONE;

// touch data
var touches = [];
// pointers are expressed in -1 to 1 coordinate space relative to domElement.
var pointers = [ new THREE.Vector2(), new THREE.Vector2() ];
var pointersOld = [ new THREE.Vector2(), new THREE.Vector2() ];
var pointersDelta = [ new THREE.Vector2(), new THREE.Vector2() ];
// hepler functions
var getClosestPoint = function( point, pointArray ) {
  if ( pointArray[ 0 ].distanceTo( point) < pointArray[ 1 ].distanceTo( point) ) {
    return pointArray[ 0 ];
  }
  return pointArray[ 1 ];
};

// var setPointers = function( event ) {
//   // Set pointes from mouse/touch events and convert to -1 to 1 coordinate space.
//   rect = domElement.getBoundingClientRect();
//   // Filter touches that originate from the same element as the event.
//   touches.length = 0;
//   if ( event.touches ) {
//     for ( var i = 0; i < event.touches.length; i++ ) {
//       if ( event.touches[ i ].target === event.path[ 0 ] ) {
//         touches.push( event.touches[ i ] );
//       }
//     }
//   }
//   // Set pointer[0] from mouse event.clientX/Y
//   if ( touches.length == 0 ) {
//     pointers[ 0 ].set(
//       ( event.clientX - rect.left ) / rect.width * 2 - 1,
//       ( event.clientY - rect.top ) / rect.height * 2 - 1
//     );
//   // Set both pointer[0] and pointer[1] from a single touch.
//   } else if ( touches.length == 1 ) {
//     pointers[ 0 ].set(
//       ( touches[ 0 ].pageX - rect.left ) / rect.width * 2 - 1,
//       ( touches[ 0 ].pageY - rect.top ) / rect.height * 2 - 1
//     );
//     pointers[ 1 ].copy( pointers[ 0 ] );
//   // Set pointer[0] and pointer[1] from two touches.
//   } else if ( touches.length == 2 ) {
//     pointers[ 0 ].set(
//       ( touches[ 0 ].pageX - rect.left ) / rect.width * 2 - 1,
//       ( touches[ 0 ].pageY - rect.top ) / rect.height * 2 - 1
//     );
//     pointers[ 1 ].set(
//       ( touches[ 1 ].pageX - rect.left ) / rect.width * 2 - 1,
//       ( touches[ 1 ].pageY - rect.top) / rect.height * 2 - 1
//     );
//   }
// };

    // event handlers

    function onMouseDown( event ) {

      if ( scope.enabled === false ) return;

      if ( event.button === 0 ) {

        state = STATE.ROTATE;

        if ( this.camera instanceof THREE.OrthographicCamera ) {

          state = STATE.PAN;

        };

      } else if ( event.button === 1 ) {

        state = STATE.ZOOM;

      } else if ( event.button === 2 ) {

        state = STATE.PAN;

      }

      scope.setPointers( event );

      pointersOld[ 0 ].copy( pointers[ 0 ] );

      document.body.appendChild(clickmask);
      window.addEventListener( 'mousemove', onMouseMove, false );
      window.addEventListener( 'mouseup', onMouseUp, false );
      window.addEventListener( 'contextmenu', onContextmenu, false );

    }

    function onMouseMove( event ) {

      if ( scope.enabled === false ) return;

      event.preventDefault();

      scope.setPointers( event );

      pointersDelta[ 0 ].subVectors( pointers[ 0 ], pointersOld[ 0 ] );
      pointersOld[ 0 ].copy( pointers[ 0 ] );

      if ( state === STATE.ROTATE ) {

        scope.rotate( pointersDelta[ 0 ] );

      } else if ( state === STATE.ZOOM ) {

        scope.zoom( pointersDelta[ 0 ] );

      } else if ( state === STATE.PAN ) {

        scope.pan( pointersDelta[ 0 ] );

      }

    }

    function onMouseUp( event ) {

      if (clickmask.parentNode == document.body) {
        document.body.removeChild(clickmask);
      }
      window.removeEventListener( 'mousemove', onMouseMove, false );
      window.removeEventListener( 'mouseup', onMouseUp, false );
      window.addEventListener( 'contextmenu', onContextmenu, false );

      state = STATE.NONE;

    }

    function onMouseWheel( event ) {

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

    function touchStart( event ) {

      if ( scope.enabled === false ) return;

      scope.setPointers( event );

      pointersOld[ 0 ].copy( pointers[ 0 ] );
      pointersOld[ 1 ].copy( pointers[ 1 ] );

    }

    function touchMove( event ) {

      if ( scope.enabled === false ) return;

      scope.setPointers( event );

      switch ( touches.length ) {

        case 1:
          pointersDelta[ 0 ].subVectors( pointers[ 0 ], getClosestPoint( pointers[ 0 ], pointersOld ) );
          pointersDelta[ 1 ].subVectors( pointers[ 1 ], getClosestPoint( pointers[ 1 ], pointersOld ) );

          if ( this.camera instanceof THREE.PerspectiveCamera ) {

            scope.rotate( pointersDelta[ 0 ] );

          } else if ( this.camera instanceof THREE.OrthographicCamera ) {

            scope.pan( pointersDelta[ 0 ] );

          }
          break;

        case 2:
          pointersDelta[ 0 ].subVectors( pointers[ 0 ], getClosestPoint( pointers[ 0 ], pointersOld ) );
          pointersDelta[ 1 ].subVectors( pointers[ 1 ], getClosestPoint( pointers[ 1 ], pointersOld ) );

          var prevDistance = pointersOld[ 0 ].distanceTo( pointersOld[ 1 ] );
          var distance = pointers[ 0 ].distanceTo( pointers[ 1 ] );

          if ( prevDistance ) {

            scope.zoom( new THREE.Vector2(0, prevDistance - distance ) );
            scope.pan( pointersDelta[ 0 ].clone().add( pointersDelta[ 1 ] ).multiplyScalar(0.5) );

          }
          break;
      }

      pointersOld[ 0 ].copy( pointers[ 0 ] );
      pointersOld[ 1 ].copy( pointers[ 1 ] );

    }

    function onContextmenu( event ) {

      event.preventDefault();

    }

    this.addListeners = function ( element ) {

      element.addEventListener( 'mousedown', onMouseDown, false );
      element.addEventListener( 'mousewheel', onMouseWheel, false );
      element.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
      element.addEventListener( 'touchstart', touchStart, false );
      element.addEventListener( 'touchmove', touchMove, false );
      element.addEventListener( 'contextmenu', onContextmenu, false );

    };

    this.removeListeners = function ( element ) {

      element.removeEventListener( 'mousedown', onMouseDown, false );
      element.removeEventListener( 'mousewheel', onMouseWheel, false );
      element.removeEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
      element.removeEventListener( 'touchstart', touchStart, false );
      element.removeEventListener( 'touchmove', touchMove, false );
      element.removeEventListener( 'contextmenu', onContextmenu, false );

    };

  };

  THREE.EditorControls.prototype = Object.create( THREE.Control.prototype );
  THREE.EditorControls.prototype.constructor = THREE.EditorControls;

  THREE.EditorControls.prototype.rotate = function ( delta ) {

    vector.copy( this.camera.position ).sub( this.target );

    theta = Math.atan2( vector.x, vector.z );
    phi = Math.atan2( Math.sqrt( vector.x * vector.x + vector.z * vector.z ), vector.y );
    rect = this.domElement.getBoundingClientRect();

    // Denormalize rotation ammount;
    theta -= delta.x * rect.width * 0.005;
    phi -= delta.y * rect.height * 0.005;

    phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

    radius = vector.length();

    vector.x = radius * Math.sin( phi ) * Math.sin( theta );
    vector.y = radius * Math.cos( phi );
    vector.z = radius * Math.sin( phi ) * Math.cos( theta );

    this.camera.position.copy( this.target ).add( vector );

    this.camera.lookAt( this.target );

    this.dispatchEvent( changeEvent );

  };

  THREE.EditorControls.prototype.pan = function ( delta ) {

    distance = this.camera.position.distanceTo( this.target );

    vector.set( -delta.x, delta.y, 0 );

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

  THREE.EditorControls.prototype.zoom = function ( delta ) {

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

  THREE.EditorControls.prototype.focus = function ( target, frame ) {

    // Collection of all centers and radii in the hierarchy of the target.

    var targets = [];

    // Bounding box (minCenter/maxCenter) encompassing all centers in hierarchy.

    var minCenter;
    var maxCenter;

    target.traverse( function( child ) {

      if (child.visible) {

        child.updateMatrixWorld( true );

        var center = new THREE.Vector3();
        var scale = new THREE.Vector3();
        var radius = 0;

        child.matrixWorld.decompose( center, new THREE.Quaternion(), scale );
        scale = ( scale.x + scale.y + scale.z ) / 3;

        //TODO: make work with non-uniform scale

        if ( child.geometry ) {

          child.geometry.computeBoundingSphere();
          center.add( child.geometry.boundingSphere.center.clone().multiplyScalar( scale )
            .applyMatrix4(child.matrixWorld) );
          radius = child.geometry.boundingSphere.radius * scale;

        }

        if ( !frame || child.geometry ) {

          targets.push( { center: center, radius: radius } );

          if ( !minCenter ) minCenter = center.clone();
          if ( !maxCenter ) maxCenter = center.clone();

          minCenter.min( center );
          maxCenter.max( center );

        }


      }


    } );

    // Center of the bounding box.

    var cumulativeCenter = minCenter.clone().add( maxCenter ).multiplyScalar( 0.5 );

    // Furthest ( center distance + radius ) from CumulativeCenter.

    var cumulativeRadius = 0;

    targets.forEach( function( child ) {

      var radius = cumulativeCenter.distanceTo( child.center ) + child.radius;
      cumulativeRadius = Math.max( cumulativeRadius, radius );

    } );

    if ( this.camera instanceof THREE.PerspectiveCamera ) {

      // Look towards cumulativeCenter

      this.target.copy( cumulativeCenter );
      this.camera.lookAt( this.target );

      if ( frame && cumulativeRadius ) {

        // Adjust distance to frame cumulativeRadius

        var fovFactor = Math.tan( ( this.camera.fov / 2 ) * Math.PI / 180.0 );
        var pos = this.camera.position.clone().sub( this.target ).normalize().multiplyScalar( cumulativeRadius  / fovFactor );

        this.camera.position.copy( this.target ).add( pos );

      }

    } else if ( this.camera instanceof THREE.OrthographicCamera ) {

      // Align camera target with cumulativeCenter

      var initialCenterOffset = this.camera.position.clone().sub( this.target );
      this.target.copy( cumulativeCenter );
      this.camera.position.copy( this.target ).add( initialCenterOffset );

      if ( frame && cumulativeRadius ) {

        // Adjust camera boundaries to frame cumulativeRadius

        cw = this.camera.right - this.camera.left;
        ch = this.camera.top - this.camera.bottom;
        aspect = cw / ch;

        if ( aspect < 1 ) {

          this.camera.top = cumulativeRadius / aspect;
          this.camera.right = cumulativeRadius;
          this.camera.bottom = -cumulativeRadius / aspect;
          this.camera.left = -cumulativeRadius;

        } else {

          this.camera.top = cumulativeRadius;
          this.camera.right = cumulativeRadius * aspect;
          this.camera.bottom = -cumulativeRadius;
          this.camera.left = -cumulativeRadius * aspect;

        }

      }

    }

    this.dispatchEvent( changeEvent );

  };

}());

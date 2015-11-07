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

  var EPS = 0.000001;
  var theta, phi, rect, radius, distance, fovFactor;
  var cw, ch, aspect, delta, center, scale, minCenter, maxCenter;

  THREE.ViewportControl = function ( camera, domElement, target, selection ) {

    THREE.Control.call( this );

    this.registerProperties( {
      target: {
        value: target,
        type: THREE.Vector3
      }
    } );

    this.camera = camera;
    this.domElement = domElement;
    this.selection = selection;

    // internal variables

    var scope = this;

    var STATE = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2 };
    var state = STATE.NONE;
    var pointers;

    // event handlers

    this.onTrack = function ( event, pointers ) {

      if ( event.type === 'mousemove' ) {

        if ( event.button === 0 ) {

          if ( scope.camera instanceof THREE.OrthographicCamera ) {

            scope.pan( pointers[ 0 ].delta );

          } else {

            scope.rotate( pointers[ 0 ].delta );

          }

        }

        if ( event.button === 1 || event.altKey ) {

          scope.zoom( pointers[ 0 ].delta );

        }

        if ( event.button === 2 || event.ctrlKey ) {

          scope.pan( pointers[ 0 ].delta );

        }

      } else if ( event.type === 'touchmove' ) {

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

    };

    this.onTrackend = function ( event, pointers ) {

      state = STATE.NONE;

    };

    this.onMousewheel = function ( event, delta ) {

      scope.zoom( new THREE.Vector2( 0, delta / 1000 ) );

    }

    this.onKeyup = function ( event, key ) {

      if ( key === 70 ) {

        scope.focusSelection();

      }

    };

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

    this.dispatchChangeEvent();

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

    this.dispatchChangeEvent();

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

    this.dispatchChangeEvent();

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

        this.dispatchChangeEvent();

      }

    }

  };

}());

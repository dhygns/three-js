/**
 * @author arodic / https://github.com/arodic
 */

 /* jshint sub:true */

( function () {

  'use strict';

  // shared variables

  var pointer, intersect, planeIntersect;

  var ray = new THREE.Raycaster();

  var point = new THREE.Vector3();
  var offset = new THREE.Vector3();

  var rotation = new THREE.Vector3();
  var offsetRotation = new THREE.Vector3();
  var scale = 1;

  var lookAtMatrix = new THREE.Matrix4();
  var eye = new THREE.Vector3();

  var tempMatrix = new THREE.Matrix4();
  var tempVector = new THREE.Vector3();
  var tempQuaternion = new THREE.Quaternion();
  var unitX = new THREE.Vector3( 1, 0, 0 );
  var unitY = new THREE.Vector3( 0, 1, 0 );
  var unitZ = new THREE.Vector3( 0, 0, 1 );

  var quaternionXYZ = new THREE.Quaternion();
  var quaternionX = new THREE.Quaternion();
  var quaternionY = new THREE.Quaternion();
  var quaternionZ = new THREE.Quaternion();
  var quaternionE = new THREE.Quaternion();

  var oldPosition = new THREE.Vector3();
  var oldScale = new THREE.Vector3();
  var oldRotationMatrix = new THREE.Matrix4();

  var parentRotationMatrix  = new THREE.Matrix4();
  var parentScale = new THREE.Vector3();

  var worldPosition = new THREE.Vector3();
  var worldRotation = new THREE.Euler();
  var worldRotationMatrix  = new THREE.Matrix4();
  var camPosition = new THREE.Vector3();
  var camRotation = new THREE.Euler();

  // events

  var changeEvent = { type: "change" };
  var mouseDownEvent = { type: "mouseDown" };
  var mouseupEvent = { type: "mouseup" };
  var objectChangeEvent = { type: "objectChange" };

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
  // clickmask.style.background = 'rgba(0,255,0,0.05)';

  THREE.TransformControls = function ( camera, domElement, target ) {

    // TODO: Make non-uniform scale and rotate play nice in hierarchies
    // TODO: ADD RXYZ contol

    THREE.Control.call( this );

    if ( !( camera instanceof THREE.Camera ) ) {
      console.warn('THREE.TransformControls requires an instance THREE.Camera')
      return;
    }

    this.camera = ( camera instanceof THREE.Camera ) ? camera : new THREE.Camera();

    this.domElement = ( domElement instanceof HTMLElement) ? domElement : document;

    this.target = ( target instanceof THREE.Object3D ) ? target : undefined;

    // API

    this.enabled = true;
    this.translationSnap = null;
    this.rotationSnap = null;

    // internal variables

    var scope = this;

    var _plane = "XY";

    this._helper = new THREE.Object3D();
    this._gizmo = {
      "translate": new THREE.TransformGizmoTranslate(),
      "rotate": new THREE.TransformGizmoRotate(),
      "scale": new THREE.TransformGizmoScale()
    };
    this._mode = "translate";

    for ( var type in this._gizmo ) {

      this._gizmo[ type ].visible = ( type === this._mode );
      this._helper.add( this._gizmo[ type ] );

    }

    // hepler functions

    function intersectObjects ( pointer, objects ) {
      ray.setFromCamera( pointer.position, scope.camera );
      return ray.intersectObjects( objects, true )[ 0 ];
    }

    function setAxis( pointer ) {
      intersect = intersectObjects( pointer, scope._gizmo[ scope._mode ].pickers.children );
      if ( intersect && intersect.object.name ) {
        if ( intersect.object.name !== scope.axis ) {
          scope.axis = intersect.object.name;
        }
      } else {
        scope.axis = ''
      }
    }

    function startTransform ( pointer ) {

      scope.dispatchEvent( mouseDownEvent );

      eye.copy( camPosition ).sub( worldPosition ).normalize();

      scope._gizmo[ scope._mode ].setActivePlane( scope.axis, eye );

      planeIntersect = intersectObjects( pointer, [ scope._gizmo[ scope._mode ].activePlane ] );

      if ( planeIntersect ) {

        oldPosition.copy( scope.target.position );
        oldScale.copy( scope.target.scale );

        oldRotationMatrix.extractRotation( scope.target.matrix );
        worldRotationMatrix.extractRotation( scope.target.matrixWorld );

        parentRotationMatrix.extractRotation( scope.target.parent.matrixWorld );
        parentScale.setFromMatrixScale( tempMatrix.getInverse( scope.target.parent.matrixWorld ) );

        offset.copy( planeIntersect.point );

      }

    }

    function transform ( pointer ) {

      planeIntersect = intersectObjects( pointer, [ scope._gizmo[ scope._mode ].activePlane ] );

      if ( planeIntersect ) {

        point.copy( planeIntersect.point );

        if ( scope._mode === "translate" ) {

          point.sub( offset );
          point.multiply( parentScale );

          if ( scope.space === "local" ) {

            point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

            if ( scope.axis.search( "X" ) === - 1 ) point.x = 0;
            if ( scope.axis.search( "Y" ) === - 1 ) point.y = 0;
            if ( scope.axis.search( "Z" ) === - 1 ) point.z = 0;

            point.applyMatrix4( oldRotationMatrix );

            scope.target.position.copy( oldPosition );
            scope.target.position.add( point );

          }

          if ( scope.space === "world" || scope.axis.search( "XYZ" ) !== - 1 ) {

            if ( scope.axis.search( "X" ) === - 1 ) point.x = 0;
            if ( scope.axis.search( "Y" ) === - 1 ) point.y = 0;
            if ( scope.axis.search( "Z" ) === - 1 ) point.z = 0;

            point.applyMatrix4( tempMatrix.getInverse( parentRotationMatrix ) );

            scope.target.position.copy( oldPosition );
            scope.target.position.add( point );

          }

          if ( scope.translationSnap !== null ) {

            if ( scope.space === "local" ) {

              scope.target.position.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

            }

            if ( scope.axis.search( "X" ) !== - 1 ) scope.target.position.x = Math.round( scope.target.position.x / scope.translationSnap ) * scope.translationSnap;
            if ( scope.axis.search( "Y" ) !== - 1 ) scope.target.position.y = Math.round( scope.target.position.y / scope.translationSnap ) * scope.translationSnap;
            if ( scope.axis.search( "Z" ) !== - 1 ) scope.target.position.z = Math.round( scope.target.position.z / scope.translationSnap ) * scope.translationSnap;

            if ( scope.space === "local" ) {

              scope.target.position.applyMatrix4( worldRotationMatrix );

            }

          }

        } else if ( scope._mode === "scale" ) {

          point.sub( offset );
          point.multiply( parentScale );

          if ( scope.space === "local" ) {

            if ( scope.axis === "XYZ" ) {

              scale = 1 + ( ( point.y ) / 50 );

              scope.target.scale.x = oldScale.x * scale;
              scope.target.scale.y = oldScale.y * scale;
              scope.target.scale.z = oldScale.z * scale;

            } else {

              point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

              if ( scope.axis === "X" ) scope.target.scale.x = oldScale.x * ( 1 + point.x / 50 );
              if ( scope.axis === "Y" ) scope.target.scale.y = oldScale.y * ( 1 + point.y / 50 );
              if ( scope.axis === "Z" ) scope.target.scale.z = oldScale.z * ( 1 + point.z / 50 );

            }

          }

        } else if ( scope._mode === "rotate" ) {

          point.sub( worldPosition );
          point.multiply( parentScale );
          tempVector.copy( offset ).sub( worldPosition );
          tempVector.multiply( parentScale );

          if ( scope.axis === "E" ) {

            point.applyMatrix4( tempMatrix.getInverse( lookAtMatrix ) );
            tempVector.applyMatrix4( tempMatrix.getInverse( lookAtMatrix ) );

            rotation.set( Math.atan2( point.z, point.y ), Math.atan2( point.x, point.z ), Math.atan2( point.y, point.x ) );
            offsetRotation.set( Math.atan2( tempVector.z, tempVector.y ), Math.atan2( tempVector.x, tempVector.z ), Math.atan2( tempVector.y, tempVector.x ) );

            tempQuaternion.setFromRotationMatrix( tempMatrix.getInverse( parentRotationMatrix ) );

            quaternionE.setFromAxisAngle( eye, rotation.z - offsetRotation.z );
            quaternionXYZ.setFromRotationMatrix( worldRotationMatrix );

            tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionE );
            tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionXYZ );

            scope.target.quaternion.copy( tempQuaternion );

          } else if ( scope.axis === "XYZE" ) {

            quaternionE.setFromEuler( point.clone().cross( tempVector ).normalize() ); // rotation axis

            tempQuaternion.setFromRotationMatrix( tempMatrix.getInverse( parentRotationMatrix ) );
            quaternionX.setFromAxisAngle( quaternionE, - point.clone().angleTo( tempVector ) );
            quaternionXYZ.setFromRotationMatrix( worldRotationMatrix );

            tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionX );
            tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionXYZ );

            scope.target.quaternion.copy( tempQuaternion );

          } else if ( scope.space === "local" ) {

            point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

            tempVector.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

            rotation.set( Math.atan2( point.z, point.y ), Math.atan2( point.x, point.z ), Math.atan2( point.y, point.x ) );
            offsetRotation.set( Math.atan2( tempVector.z, tempVector.y ), Math.atan2( tempVector.x, tempVector.z ), Math.atan2( tempVector.y, tempVector.x ) );

            quaternionXYZ.setFromRotationMatrix( oldRotationMatrix );

            if ( scope.rotationSnap !== null ) {

              quaternionX.setFromAxisAngle( unitX, Math.round( ( rotation.x - offsetRotation.x ) / scope.rotationSnap ) * scope.rotationSnap );
              quaternionY.setFromAxisAngle( unitY, Math.round( ( rotation.y - offsetRotation.y ) / scope.rotationSnap ) * scope.rotationSnap );
              quaternionZ.setFromAxisAngle( unitZ, Math.round( ( rotation.z - offsetRotation.z ) / scope.rotationSnap ) * scope.rotationSnap );

            } else {

              quaternionX.setFromAxisAngle( unitX, rotation.x - offsetRotation.x );
              quaternionY.setFromAxisAngle( unitY, rotation.y - offsetRotation.y );
              quaternionZ.setFromAxisAngle( unitZ, rotation.z - offsetRotation.z );

            }

            if ( scope.axis === "X" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionX );
            if ( scope.axis === "Y" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionY );
            if ( scope.axis === "Z" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionZ );

            scope.target.quaternion.copy( quaternionXYZ );

          } else if ( scope.space === "world" ) {

            rotation.set( Math.atan2( point.z, point.y ), Math.atan2( point.x, point.z ), Math.atan2( point.y, point.x ) );
            offsetRotation.set( Math.atan2( tempVector.z, tempVector.y ), Math.atan2( tempVector.x, tempVector.z ), Math.atan2( tempVector.y, tempVector.x ) );

            tempQuaternion.setFromRotationMatrix( tempMatrix.getInverse( parentRotationMatrix ) );

            if ( scope.rotationSnap !== null ) {

              quaternionX.setFromAxisAngle( unitX, Math.round( ( rotation.x - offsetRotation.x ) / scope.rotationSnap ) * scope.rotationSnap );
              quaternionY.setFromAxisAngle( unitY, Math.round( ( rotation.y - offsetRotation.y ) / scope.rotationSnap ) * scope.rotationSnap );
              quaternionZ.setFromAxisAngle( unitZ, Math.round( ( rotation.z - offsetRotation.z ) / scope.rotationSnap ) * scope.rotationSnap );

            } else {

              quaternionX.setFromAxisAngle( unitX, rotation.x - offsetRotation.x );
              quaternionY.setFromAxisAngle( unitY, rotation.y - offsetRotation.y );
              quaternionZ.setFromAxisAngle( unitZ, rotation.z - offsetRotation.z );

            }

            quaternionXYZ.setFromRotationMatrix( worldRotationMatrix );

            if ( scope.axis === "X" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionX );
            if ( scope.axis === "Y" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionY );
            if ( scope.axis === "Z" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionZ );

            tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionXYZ );

            scope.target.quaternion.copy( tempQuaternion );

          }

        }

        scope.update();
        scope.dispatchEvent( changeEvent );
        scope.dispatchEvent( objectChangeEvent );

      }

    }

    function endTransform () {

      mouseupEvent.mode = scope._mode;
      scope.dispatchEvent( mouseupEvent );

    }

    // event handlers

    function onMousedown ( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;
      if ( event.button !== 0 ) return;

      pointer = scope.getPointersFromEvent( event, true )[ 0 ];

      if (scope.axis !== '') {

        startTransform(pointer);

        window.addEventListener( 'mousemove', onMousemove );
        window.addEventListener( 'mouseup', onMouseup );
        window.addEventListener( 'contextmenu', onContextmenu );

        if (clickmask.parentNode !== document.body) {
          document.body.appendChild(clickmask);
        }

      }

    }

    function onMousehover ( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      pointer = scope.getPointersFromEvent( event )[ 0 ];

      setAxis( pointer );

    }

    function onMousemove ( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      pointer = scope.getPointersFromEvent( event )[ 0 ];

      transform( pointer );

    }

    function onMouseup ( event ) {

      if (clickmask.parentNode == document.body) {
        document.body.removeChild(clickmask);
      }
      window.removeEventListener( 'mousemove', onMousemove );
      window.removeEventListener( 'mouseup', onMouseup );
      window.addEventListener( 'contextmenu', onContextmenu );

      if ( scope.enabled === false ) return;
      if ( event.button !== 0 ) return;

      this.axis = '';

      endTransform();

    }

    function onTouchstart( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      pointer = scope.getPointersFromEvent( event, true )[ 0 ];

      setAxis( pointer );

      if (scope.axis !== '') {

        startTransform(pointer);

        if (clickmask.parentNode !== document.body) {
          document.body.appendChild(clickmask);
        }

      }

    }

    function onTouchmove ( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;
      if ( scope.axis === '' ) return;

      pointer = scope.getPointersFromEvent( event )[ 0 ];

      transform( pointer );

    }

    function onTouchend ( event ) {

      endTransform();

      scope.axis = '';

      if (clickmask.parentNode == document.body) {
        document.body.removeChild(clickmask);
      }

    }

    function onContextmenu ( event ) {

      event.preventDefault();

    }

    this.addListeners = function ( element ) {

      element.addEventListener( "mousedown", onMousedown );
      element.addEventListener( "mousemove", onMousehover );
      element.addEventListener( 'touchstart', onTouchstart );
      element.addEventListener( 'contextmenu', onContextmenu );
      element.addEventListener( 'touchmove', onTouchmove );
      element.addEventListener( 'touchend', onTouchend );

    };

    this.removeListeners = function ( element ) {

      element.removeEventListener( "mousedown", onMousedown );
      element.removeEventListener( "mousemove", onMousehover );
      element.removeEventListener( "touchstart", onTouchstart );
      element.removeEventListener( 'contextmenu', onContextmenu );
      element.removeEventListener( 'touchmove', onTouchmove );
      element.removeEventListener( 'touchend', onTouchend );

    };

    this.onTargetChange(function () {
      this.update();
    });

  };

  THREE.TransformControls.prototype = Object.create( THREE.Control.prototype );
  THREE.TransformControls.prototype.constructor = THREE.TransformControls;

  THREE.TransformControls.prototype.update = function () {

      if ( this.target === undefined ) return;

      this.target.updateMatrixWorld();
      worldPosition.setFromMatrixPosition( this.target.matrixWorld );
      worldRotation.setFromRotationMatrix( tempMatrix.extractRotation( this.target.matrixWorld ) );

      this.camera.updateMatrixWorld();
      camPosition.setFromMatrixPosition( this.camera.matrixWorld );
      camRotation.setFromRotationMatrix( tempMatrix.extractRotation( this.camera.matrixWorld ) );

      if ( this.camera.type === 'OrthographicCamera' ) {

        scale = ( this.camera.top - this.camera.bottom ) / 3 * this.size;

      } else {

        scale = worldPosition.distanceTo( camPosition ) / 6 * this.size;

      }

      this._helper.position.copy( worldPosition );
      this._helper.scale.set( scale, scale, scale );

      eye.copy( camPosition ).sub( worldPosition ).normalize();

      if ( this.space === "local" ) {

        this._gizmo[ this._mode ].update( worldRotation, eye );

      } else if ( this.space === "world" ) {

        this._gizmo[ this._mode ].update( new THREE.Euler(), eye );

      }

      this._gizmo[ this._mode ].highlight( this.axis );

  }

  Object.defineProperties( THREE.TransformControls.prototype, {

    camera: {

      get: function () {

        return this._camera;

      },

      set: function ( camera ) {

        var oldCamera = this._camera;
        this._camera = camera;

        window.clearTimeout(this._cameraSetTimeout);
        this._cameraSetTimeout = setTimeout(function () {

          this.update();
          this.dispatchEvent( changeEvent );

          this.onCameraChangeCallback( camera, oldCamera );
          delete this._cameraSetTimeout;

        }.bind(this));

      }

    },

    axis: {

      get: function () {

        return this._axis || '';

      },

      set: function ( axis ) {

        this._axis = axis;
        this.update();
        this.dispatchEvent( changeEvent );

      }

    },

    mode: {

      get: function () {

        return this._mode || '';

      },

      set: function ( mode ) {

        this._mode = mode;
        if ( mode === "scale" ) this.space = "local";
        for ( var type in this._gizmo ) this._gizmo[ type ].visible = ( type === this._mode );
        this.update();
        this.dispatchEvent( changeEvent );

      }

    },

    size: {

      get: function () {

        return this._size || 1;

      },

      set: function ( size ) {

        this._size = size;
        this.update();
        this.dispatchEvent( changeEvent );

      }

    },

    space: {

      get: function () {

        return this._space || 'local';

      },

      set: function ( space ) {

        this._space = space;
        this.update();
        this.dispatchEvent( changeEvent );

      }

    }


  } );

  // Deprication warnings

  THREE.TransformControls.prototype.setMode = function ( mode ) {

    console.warn( 'THREE.TransformControls: .setMode has been deprecated. Use .mode property instead.' );
    this.mode = mode;

  };

  THREE.TransformControls.prototype.setTranslationSnap = function ( translationSnap ) {

    console.warn( 'THREE.TransformControls: .setTranslationSnap has been deprecated. Use .translationSnap property instead.' );
    scope.translationSnap = translationSnap;

  };

  THREE.TransformControls.prototype.setRotationSnap = function ( rotationSnap ) {

    console.warn( 'THREE.TransformControls: .setRotationSnap has been deprecated. Use .rotationSnap property instead.' );
    scope.rotationSnap = rotationSnap;

  };

  THREE.TransformControls.prototype.setSize = function ( size ) {

    console.warn( 'THREE.TransformControls: .setSize has been deprecated. Use .size property instead.' );
    scope.size = size;

  };

  THREE.TransformControls.prototype.setSpace = function ( space ) {

    console.warn( 'THREE.TransformControls: .setSpace has been deprecated. Use .space property instead.' );
    scope.space = space;

  };

}() );

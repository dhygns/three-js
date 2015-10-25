/**
 * @author arodic / https://github.com/arodic
 */

 /* jshint sub:true */

( function () {

  'use strict';

  // shared variables

  var rect, x, y, intersections, type;

  var pointer, intersect, axis;

  var ray = new THREE.Raycaster();
  var pointerVector = new THREE.Vector2();

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

  // Element to be added to body during a drag gesture.
  // It prevents other elements from recieving events and stopping propagaion.
  var clickmask = document.createElement( 'div' );
  clickmask.style.position = 'fixed';
  clickmask.style.top = 0;
  clickmask.style.left = 0;
  clickmask.style.bottom = 0;
  clickmask.style.right = 0;
  clickmask.style.zIndex = 10000000;

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

    this.target = ( target instanceof THREE.Object3D ) ? target : new THREE.Object3D();

    // API

    this.enabled = true;
    this.visible = false;
    this.translationSnap = null;
    this.rotationSnap = null;
    this.space = "world";
    this.axis = null;
    this.size = 1;

    // internal variables

    var scope = this;

    // var _dragging = false;
    var _plane = "XY";

    this._helper = new THREE.Object3D();
    this._gizmo = {
      "translate": new THREE.TransformGizmoTranslate(),
      "rotate": new THREE.TransformGizmoRotate(),
      "scale": new THREE.TransformGizmoScale()
    };
    this._mode = "translate";

    // TODO: move to shared variables
    var changeEvent = { type: "change" };
    var mouseDownEvent = { type: "mouseDown" };
    var mouseUpEvent = { type: "mouseUp", mode: this._mode };
    var objectChangeEvent = { type: "objectChange" };

    for ( type in this._gizmo ) {

      this._gizmo[ type ].visible = ( type === this._mode );
      this._helper.add( this._gizmo[ type ] );

    }

    // hepler functions

    function intersectObjects( pointer, objects ) {

      rect = domElement.getBoundingClientRect();
      x = ( pointer.clientX - rect.left ) / rect.width;
      y = ( pointer.clientY - rect.top ) / rect.height;

      pointerVector.set( ( x * 2 ) - 1, - ( y * 2 ) + 1 );
      ray.setFromCamera( pointerVector, scope.camera );

      intersections = ray.intersectObjects( objects, true );
      return intersections[ 0 ] ? intersections[ 0 ] : false;

    }

    // event handlers

    function onMouseDown( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;

      if ( pointer.button === 0 || pointer.button === undefined ) {

        var intersect = intersectObjects( pointer, scope._gizmo[ scope._mode ].pickers.children );

        if ( intersect ) {

          event.preventDefault();
          event.stopPropagation();

          scope.dispatchEvent( mouseDownEvent );

          scope.axis = intersect.object.name;

          scope.update();

          eye.copy( camPosition ).sub( worldPosition ).normalize();

          scope._gizmo[ scope._mode ].setActivePlane( scope.axis, eye );

          var planeIntersect = intersectObjects( pointer, [ scope._gizmo[ scope._mode ].activePlane ] );

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

      }

      document.body.appendChild(clickmask);
      window.addEventListener( 'mousemove', onMouseMove, false );
      window.addEventListener( 'mouseup', onMouseUp, false );
      window.addEventListener( 'contextmenu', onContextmenu, false );
    }

    function onMouseHover( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;

      intersect = intersectObjects( pointer, scope._gizmo[ scope._mode ].pickers.children );

      axis = null;

      if ( intersect ) {

        axis = intersect.object.name;

        event.preventDefault();

      }

      if ( scope.axis !== axis ) {

        scope.axis = axis;
        scope.update();
        scope.dispatchEvent( changeEvent );

      }

    }

    function onMouseMove( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;

      var planeIntersect = intersectObjects( pointer, [ scope._gizmo[ scope._mode ].activePlane ] );

      if ( planeIntersect === false ) return;

      event.preventDefault();
      event.stopPropagation();

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

    function onMouseUp( event ) {

      if ( scope.enabled === false ) return;

      if ( event.button !== undefined && event.button !== 0 ) return;

      if ( scope.axis !== null ) {

        mouseUpEvent.mode = scope._mode;
        scope.dispatchEvent( mouseUpEvent )

      }

      if (clickmask.parentNode == document.body) {
        document.body.removeChild(clickmask);
      }
      window.removeEventListener( 'mousemove', onMouseMove, false );
      window.removeEventListener( 'mouseup', onMouseUp, false );
      window.addEventListener( 'contextmenu', onContextmenu, false );

    }

    function onContextmenu( event ) {

      event.preventDefault();

    }

    this.addListeners = function ( element ) {

      element.addEventListener( "mousedown", onMouseDown, false );
      element.addEventListener( 'touchstart', onMouseDown, false );
      element.addEventListener( "mousemove", onMouseHover, false );
      // element.addEventListener( 'touchmove', onMouseMove, false );
      element.addEventListener( 'contextmenu', onContextmenu, false );

    };

    this.removeListeners = function ( element ) {

      element.removeEventListener( "mousedown", onMouseDown, false );
      element.removeEventListener( "touchstart", onMouseDown, false );
      element.removeEventListener( "mousemove", onMouseHover, false );
      // element.removeEventListener( 'touchmove', onMouseMove, false );
      element.removeEventListener( 'contextmenu', onContextmenu, false );

    };

    this.onTargetChangeCallback = function () {

      this.update();

    };


    // this.setMode = function ( mode ) {
    //
    //   this._mode = mode ? mode : this._mode;
    //
    //   if ( this._mode === "scale" ) scope.space = "local";
    //
    //   for ( var type in this._gizmo ) this._gizmo[ type ].visible = ( type === this._mode );
    //
    //   this.update();
    //   scope.dispatchEvent( changeEvent );
    //
    // };
    //
    // this.setTranslationSnap = function ( translationSnap ) {
    //
    //   scope.translationSnap = translationSnap;
    //
    // };
    //
    // this.setRotationSnap = function ( rotationSnap ) {
    //
    //   scope.rotationSnap = rotationSnap;
    //
    // };
    //
    // this.setSize = function ( size ) {
    //
    //   scope.size = size;
    //   this.update();
    //   scope.dispatchEvent( changeEvent );
    //
    // };
    //
    // this.setSpace = function ( space ) {
    //
    //   scope.space = space;
    //   this.update();
    //   scope.dispatchEvent( changeEvent );
    //
    // };
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

}() );

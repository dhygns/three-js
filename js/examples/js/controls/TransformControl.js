/**
 * @author arodic / https://github.com/arodic
 */


//TODO: fix rotate snap!

( function () {

  'use strict';

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

  var changeEvent = { type: 'change' };

  THREE.TransformControl = function ( camera, domElement, target, selection ) {

    // TODO: Make non-uniform scale and rotate play nice in hierarchies

    THREE.Control.call( this );

    this.registerProperties( {
      camera: {
        value: camera,
        type: THREE.Camera,
        observer: 'update',
        notify: true
      },
      domElement: {
        value: domElement,
        type: HTMLElement,
        notify: true
      },
      target: {
        value: target,
        type: THREE.Object3D,
        observer: 'update',
        notify: true
      },
      selection: {
        value: selection,
        type: THREE.Selection,
        observer: 'selectionChanged',
        notify: true
      },
      mode: {
        value: 'translate',
        type: 'string',
        observer: 'update',
        notify: true
      },
      size: {
        value: 1,
        type: 'number',
        observer: 'update',
        notify: true
      },
      axis: {
        value: '',
        type: 'string',
        observer: 'update',
        notify: true
      },
      space: {
        value: 'local',
        type: 'string',
        observer: 'update',
        notify: true
      },
      enabled: {
        value: true,
        type: 'boolean',
        notify: true
      }
    } );

    // API

    this.translationSnap = null;
    this.rotationSnap = null;

    // internal variables

    var scope = this;

    var pointer, point;

    var worldMatrixStart = new THREE.Matrix4();

    var worldPoint = new THREE.Vector3();
    var worldPointStart = new THREE.Vector3();
    var worldShift = new THREE.Vector3();
    var worldCross = new THREE.Vector3();
    var worldQuaternion= new THREE.Quaternion();
    var localPoint = new THREE.Vector3();
    var localPointStart = new THREE.Vector3();
    var localShift = new THREE.Vector3();
    var localCross = new THREE.Vector3();
    var localQuaternion= new THREE.Quaternion();
    var localScale = new THREE.Vector3();

    var unitX = new THREE.Vector3( 1, 0, 0 );
    var unitY = new THREE.Vector3( 0, 1, 0 );
    var unitZ = new THREE.Vector3( 0, 0, 1 );

    var tempMatrix = new THREE.Matrix4();
    var tempVector = new THREE.Vector3();

    this.gizmo = new THREE.TransformGizmoControl();

    this.helper = this.gizmo.helper;

    this.bindProperty( 'camera', this.gizmo, 'camera' );
    this.bindProperty( 'target', this.gizmo, 'target' );
    this.bindProperty( 'mode', this.gizmo, 'mode' );
    this.bindProperty( 'size', this.gizmo, 'size' );
    this.bindProperty( 'axis', this.gizmo, 'axis' );
    this.bindProperty( 'space', this.gizmo, 'space' );

    // hepler functions

    function selectionTransformInit () {

      var objects = scope.selection.objects;

      for( var i = 0; i < objects.length; i++ ) {

        objects[ i ]._positionStart = objects[ i ].position.clone();
        objects[ i ]._quaternionStart = objects[ i ].quaternion.clone();
        objects[ i ]._scaleStart = objects[ i ].scale.clone();

      }

    }

    function selectionTranslate () {

      var objects = scope.selection.objects;

      for( var i = 0; i < objects.length; i++ ) {

        if ( scope.space === 'local' ) {

          objects[ i ].position.copy( localShift ).applyQuaternion( objects[ i ]._quaternionStart );

        } else {

          objects[ i ].position.copy( worldShift );

        }

        objects[ i ].position.add( objects[ i ]._positionStart );

      }

    }

    function selectionScale () {

      var objects = scope.selection.objects;

      for( var i = 0; i < objects.length; i++ ) {

        objects[ i ].scale.copy( objects[ i ]._scaleStart ).multiply( localScale );

      }

    }

    function selectionRotate () {

      var objects = scope.selection.objects;

      for( var i = 0; i < objects.length; i++ ) {

        if ( scope.space === 'world' ) {

            objects[ i ].quaternion.copy( worldQuaternion );
            objects[ i ].quaternion.multiply( objects[ i ]._quaternionStart );

        } else {

            objects[ i ].quaternion.copy( objects[ i ]._quaternionStart );
            objects[ i ].quaternion.multiply( localQuaternion );

        }

      }

    }

    function selectionTransformClear () {

      var objects = scope.selection.objects;

      for( var i = 0; i < objects.length; i++ ) {

        delete objects[ i ]._positionStart;
        delete objects[ i ]._quaternionStart;
        delete objects[ i ]._scaleStart;

      }

    }

    function transformStart ( point ) {

      selectionTransformInit();

      worldMatrixStart = scope.target.matrixWorld.clone();

      worldPointStart.copy( point );
      localPointStart.copy( point );
      localPointStart.applyMatrix4( tempMatrix.getInverse( worldMatrixStart ) );

      scope.selection.helper.visible = false;

      scope.dispatchEvent( { type: 'transformstart' } );

    }

    function transform ( point ) {

      var objects = scope.selection.objects;
      var target = scope.target;
      var axis = scope.axis;

      var direction;

      worldPoint.copy( point );
      worldShift.subVectors( worldPoint, worldPointStart );

      localPoint.copy( worldPoint );
      localPoint.applyMatrix4( tempMatrix.getInverse( worldMatrixStart ) );
      localShift.subVectors( localPoint, localPointStart );
      worldCross.copy(worldPoint).cross(worldPointStart);
      localCross.copy(localPoint).cross(localPointStart);

      if ( scope.mode === 'translate' ) {

        if ( axis.search( 'X' ) === - 1 ) {
          worldShift.x = 0;
          localShift.x = 0;
        }
        if ( axis.search( 'Y' ) === - 1 ) {
          worldShift.y = 0;
          localShift.y = 0;
        }
        if ( axis.search( 'Z' ) === - 1 ) {
          worldShift.z = 0;
          localShift.z = 0;
        }

        selectionTranslate();

      } else if ( scope.mode === 'scale' ) {

        if ( axis === 'XYZ' ) {

          localScale.set( worldShift.y / 50, worldShift.y / 50, worldShift.y / 50 ).addScalar( 1 );

        } else {

          localScale.set(
            axis === 'X' ? localShift.x / 50 : 0,
            axis === 'Y' ? localShift.y / 50 : 0,
            axis === 'Z' ? localShift.z / 50 : 0
          ).addScalar( 1 );

        }

        selectionScale();

      } else if ( scope.mode === 'rotate' ) {

        if ( axis === 'E' || axis === 'XYZE' ) scope.space = 'world';

        if ( axis === 'E' ) {

          direction = worldCross.dot(scope.gizmo.eye) > 0 ? -1 : 1;
          worldQuaternion.setFromAxisAngle( scope.gizmo.eye, worldPoint.angleTo(worldPointStart) * direction );

        } else if ( axis === 'XYZE' ) {

          tempVector.copy(worldShift).cross(scope.gizmo.eye).normalize();
          worldQuaternion.setFromAxisAngle( tempVector, - 0.04 * worldShift.length() );

        } else {

          if ( axis === 'X' ) {

            localQuaternion.setFromAxisAngle( unitX, localPoint.angleTo(localPointStart) * ( localCross.x > 0 ? -1 : 1 ) );
            worldQuaternion.setFromAxisAngle( unitX, worldPoint.angleTo(worldPointStart) * ( worldCross.x > 0 ? -1 : 1 ) );

          } else if ( axis === 'Y' ) {

            localQuaternion.setFromAxisAngle( unitY, localPoint.angleTo(localPointStart) * ( localCross.y > 0 ? -1 : 1 ) );
            worldQuaternion.setFromAxisAngle( unitY, worldPoint.angleTo(worldPointStart) * ( worldCross.y > 0 ? -1 : 1 ) );

          } else if ( axis === 'Z' ) {

            localQuaternion.setFromAxisAngle( unitZ, localPoint.angleTo(localPointStart) * ( localCross.z > 0 ? -1 : 1 ) );
            worldQuaternion.setFromAxisAngle( unitZ, worldPoint.angleTo(worldPointStart) * ( worldCross.z > 0 ? -1 : 1 ) );

          }

        }

        selectionRotate();

      }

      scope.gizmo.updateTransform();
      scope.dispatchEvent( { type: 'transform' } );
      scope.dispatchEvent( changeEvent );

    }

    function transformEnd () {

      selectionTransformClear();

      scope.selection.updateHelper();
      scope.selection.helper.visible = true;

      scope.dispatchEvent( { type: 'transformend' } );
      scope.dispatchEvent( changeEvent );

    }

    // event handlers

    function onMousedown ( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;
      if ( event.button !== 0 ) return;
      if ( scope.axis === '' ) return;

      pointer = scope.getPointersFromEvent( event, true )[ 0 ];
      point = scope.gizmo.getPointOnPlane( pointer );

      if ( !point ) return;

      transformStart( point );

      window.addEventListener( 'mousemove', onMousemove );
      window.addEventListener( 'mouseup', onMouseup );
      window.addEventListener( 'contextmenu', onContextmenu );

      if (clickmask.parentNode !== document.body) {
        document.body.appendChild(clickmask);
      }

    }

    function onMousehover ( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      pointer = scope.getPointersFromEvent( event, true )[ 0 ];

      scope.gizmo.setAxisFromPointer( pointer );

    }

    function onMousemove ( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      pointer = scope.getPointersFromEvent( event )[ 0 ];
      point = scope.gizmo.getPointOnPlane( pointer );

      if ( !point ) return;

      transform( point );

    }

    function onMouseup ( event ) {

      if (clickmask.parentNode == document.body) {
        document.body.removeChild(clickmask);
      }
      window.removeEventListener( 'mousemove', onMousemove );
      window.removeEventListener( 'mouseup', onMouseup );
      window.addEventListener( 'contextmenu', onContextmenu );

      transformEnd();

    }

    function onTouchstart( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;

      event.preventDefault();

      pointer = scope.getPointersFromEvent( event, true )[ 0 ];

      scope.gizmo.setAxisFromPointer( pointer );
      point = scope.gizmo.getPointOnPlane( pointer );

      if ( scope.axis === '' ) return;
      if ( !point ) return;

      transformStart( point );

      if (clickmask.parentNode !== document.body) {
        document.body.appendChild(clickmask);
      }

    }

    function onTouchmove ( event ) {

      if ( scope.enabled === false ) return;
      if ( scope.target === undefined ) return;
      if ( scope.axis === '' ) return;

      event.preventDefault();

      pointer = scope.getPointersFromEvent( event )[ 0 ];
      point = scope.gizmo.getPointOnPlane( pointer );

      if ( !point ) return;

      transform( point );

    }

    function onTouchend ( event ) {

      event.preventDefault();

      transformEnd();

      if (clickmask.parentNode == document.body) {
        document.body.removeChild(clickmask);
      }

    }

    function onContextmenu ( event ) {

      event.preventDefault();

    }

    function onKeyup ( event ) {
      switch (event.which) {
        case 87:
          scope.mode = 'translate';
          break;
        case 69:
          scope.mode = 'rotate';
          break;
        case 82:
          scope.mode = 'scale';
          break;
        case 81:
          scope.space = scope.space === 'local' ? 'world' : 'local';
          break;
      }

    }

    this.addEventListener( 'domelementchange', function ( event ) {

      if ( event.value ) {

        event.value.addEventListener( 'mousedown', onMousedown );
        event.value.addEventListener( 'mousemove', onMousehover );
        event.value.addEventListener( 'touchstart', onTouchstart );
        event.value.addEventListener( 'contextmenu', onContextmenu );
        event.value.addEventListener( 'touchmove', onTouchmove );
        event.value.addEventListener( 'touchend', onTouchend );
        event.value.addEventListener( 'keyup', onKeyup );

      }

      if ( event.oldValue ) {

        event.oldValue.removeEventListener( 'mousedown', onMousedown );
        event.oldValue.removeEventListener( 'mousemove', onMousehover );
        event.oldValue.removeEventListener( 'touchstart', onTouchstart );
        event.oldValue.removeEventListener( 'contextmenu', onContextmenu );
        event.oldValue.removeEventListener( 'touchmove', onTouchmove );
        event.oldValue.removeEventListener( 'touchend', onTouchend );
        event.oldValue.removeEventListener( 'keyup', onKeyup );

      }

    } );

  };

  THREE.TransformControl.prototype = Object.create( THREE.Control.prototype );
  THREE.TransformControl.prototype.constructor = THREE.TransformControl;

  THREE.TransformControl.prototype.update = function () {

    this.debounce( 'update', function () {

      this.gizmo.visible = this.target && this.enabled === true;

      if ( !this.target ) return;

      this.gizmo.update();

      if ( this.mode === 'scale' ) this.space = 'local';

      this.dispatchEvent( changeEvent );

    }.bind( this ) );

  };

  THREE.TransformControl.prototype.selectionChanged = function ( selection, oldSelection ) {

    this._setTargetFromSelection = this._setTargetFromSelection || this.setTargetFromSelection.bind( this );

    if ( oldSelection ) oldSelection.removeEventListener( 'change', this._setTargetFromSelection );

    this.selection.addEventListener( 'change', this._setTargetFromSelection );

  };

  THREE.TransformControl.prototype.setTargetFromSelection = function () {

    if ( this.selection.objects.length ) {

      this.target = this.selection.objects[ this.selection.objects.length - 1 ];

    } else {

      this.target = undefined;

    }

  };


  // Deprication warnings

  THREE.TransformControl.prototype.setMode = function ( mode ) {

    console.warn( 'THREE.TransformControl: .setMode has been deprecated. Use .mode property instead.' );
    this.mode = mode;

  };

  THREE.TransformControl.prototype.setTranslationSnap = function ( translationSnap ) {

    console.warn( 'THREE.TransformControl: .setTranslationSnap has been deprecated. Use .translationSnap property instead.' );
    scope.translationSnap = translationSnap;

  };

  THREE.TransformControl.prototype.setRotationSnap = function ( rotationSnap ) {

    console.warn( 'THREE.TransformControl: .setRotationSnap has been deprecated. Use .rotationSnap property instead.' );
    scope.rotationSnap = rotationSnap;

  };

  THREE.TransformControl.prototype.setSize = function ( size ) {

    console.warn( 'THREE.TransformControl: .setSize has been deprecated. Use .size property instead.' );
    scope.size = size;

  };

  THREE.TransformControl.prototype.setSpace = function ( space ) {

    console.warn( 'THREE.TransformControl: .setSpace has been deprecated. Use .space property instead.' );
    scope.space = space;

  };

}() );

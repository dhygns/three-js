/**
 * @author arodic / http://akirodic.com/
 */

( function () {

  'use strict';

  // shared variables

  var pointerStart, pointerEnd, intersect, object;
  var raycaster = new THREE.Raycaster();

  var changeEvent = { type: 'change' };

  THREE.SelectionControl = function ( camera, domElement, scene, selection ) {

    THREE.Control.call( this );

    this.registerProperties( {
      camera: {
        value: camera,
        type: THREE.Camera,
        notify: true
      },
      scene: {
        value: scene,
        type: THREE.Scene,
        notify: true
      },
      domElement: {
        value: domElement,
        type: HTMLElement,
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
      }
    } );

    // internal variables

    var scope = this;

    var pointers;
    var hasMoved = false;

    // helper functions

    function selectWithPointer ( pointer, additive ) {

      raycaster.setFromCamera( pointer, scope.camera );
      intersect = raycaster.intersectObjects( [ scope.scene ], true )[ 0 ];

      if ( intersect ) {

          object = intersect.object;
          if ( object.parent && object.parent instanceof THREE.Object3D ) {
            object = object.parent;
          }

          if ( additive ) {

            scope.selection.toggle( object );

          } else {

            scope.selection.clear();
            scope.selection.add( object );

          }

      } else {

        if ( !additive ) {

            scope.selection.clear();

        }

      }

      scope.dispatchEvent( changeEvent );

    }

    // event handlers

    function onMousedown( event ) {

      if ( scope.enabled === false ) return;
      if ( event.button !== 0 ) return;

      hasMoved = false;

      pointerStart = pointerEnd = scope.getPointersFromEvent( event, true )[ 0 ].position;

      scope.domElement.addEventListener( 'mousemove', onMousemove );
      scope.domElement.addEventListener( 'mouseup', onMouseup );
      scope.domElement.addEventListener( 'contextmenu', onContextmenu );

    }

    function onMousemove( event ) {

      if ( scope.enabled === false ) return;

      pointerEnd = scope.getPointersFromEvent( event )[ 0 ].position;

      if ( pointerStart.distanceTo( pointerEnd ) > 0.02 ) {

        hasMoved = true;

      }

    }

    function onMouseup( event ) {

      if ( !hasMoved ) {

        selectWithPointer( pointerEnd, event.shiftKey );

      }

      scope.domElement.removeEventListener( 'mousemove', onMousemove );
      scope.domElement.removeEventListener( 'mouseup', onMouseup );
      scope.domElement.addEventListener( 'contextmenu', onContextmenu );

    }

    function onTouchstart( event ) {

      event.preventDefault();

      if ( scope.enabled === false ) return;

      pointerStart = pointerEnd = scope.getPointersFromEvent( event, true )[ 0 ].position;

      scope.domElement.addEventListener( 'touchmove', onTouchmove );
      scope.domElement.addEventListener( 'touchend', onTouchend );

    }

    function onTouchmove( event ) {

      event.preventDefault();

      if ( scope.enabled === false ) return;

      pointerEnd = scope.getPointersFromEvent( event, true )[ 0 ].position;

    }

    function onTouchend( event ) {

      event.preventDefault();

      if ( pointerStart.distanceTo( pointerEnd ) < 0.01 ) {

        selectWithPointer( pointerEnd );

      }

      scope.domElement.removeEventListener( 'touchmove', onTouchmove );
      scope.domElement.removeEventListener( 'touchend', onTouchend );

    }

    function onKeyup(event) {

      switch (event.which) {
        case 38:
          scope.selection.selectParents( object );
          break;
        case 40:
          scope.selection.selectChildren( object );
          break;
        case 39:
          scope.selection.selectNext( object );
          break;
        case 37:
          scope.selection.selectPrevious( object );
          break;
      }

    }

    function onContextmenu( event ) {

      event.preventDefault();

    }

    this.addEventListener( 'domelementchange', function ( event ) {

      if ( event.value ) {

        event.value.addEventListener( 'mousedown', onMousedown );
        event.value.addEventListener( 'touchstart', onTouchstart );
        event.value.addEventListener( 'keyup', onKeyup );
        event.value.addEventListener( 'contextmenu', onContextmenu );

      }

      if ( event.oldValue ) {

        event.oldValue.removeEventListener( 'mousedown', onMousedown );
        event.oldValue.removeEventListener( 'touchstart', onTouchstart );
        event.oldValue.removeEventListener( 'keyup', onKeyup );
        event.oldValue.removeEventListener( 'contextmenu', onContextmenu );

      }

    } );

  };

  THREE.SelectionControl.prototype = Object.create( THREE.Control.prototype );
  THREE.SelectionControl.prototype.constructor = THREE.SelectionControl;

}());

/**
 * @author arodic / http://akirodic.com/
 */

( function () {

  'use strict';

  // shared variables

  var raycaster = new THREE.Raycaster();

  THREE.SelectionControl = function ( camera, domElement, scene, selection ) {

    THREE.Control.call( this );

    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.selection = selection;

    // internal variables

    var scope = this;

    var intersect, object;

    // helper functions

    function selectWithPointer ( pointer, additive ) {

      raycaster.setFromCamera( pointer, scope.camera );
      intersect = raycaster.intersectObjects( [ scope.scene ], true )[ 0 ];

      if ( intersect ) {

          object = intersect.object;

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

    }

    // event handlers

    this.onTrackend = function ( event, pointers ) {

      if ( pointers[0].offset.length() < 0.05 ) selectWithPointer( pointers[0].position );

    };

    this.onKeyup = function ( event, key ) {

      switch ( key ) {

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

    };

  };

  THREE.SelectionControl.prototype = Object.create( THREE.Control.prototype );
  THREE.SelectionControl.prototype.constructor = THREE.SelectionControl;

}());

/**
 * @author arodic / https://github.com/arodic
 */

( function () {

  'use strict';

  // shared variables

  var changeEvent = { type: 'change' };

  {

    var scale;

    var tempVector = new THREE.Vector3();
    var alignVector = new THREE.Vector3();
    var tempQuaternion = new THREE.Quaternion();
    var tempMatrix = new THREE.Matrix4();

    var unitX = new THREE.Vector3( 1, 0, 0 );
    var unitY = new THREE.Vector3( 0, 1, 0 );
    var unitZ = new THREE.Vector3( 0, 0, 1 );
    var unit0 = new THREE.Vector3( 0, 0, 0 );

    var intersect;
    var ray = new THREE.Raycaster();

    {

      // shared materials

      var gizmoMaterial = new THREE.MeshBasicMaterial();
      gizmoMaterial.depthTest = false;
      gizmoMaterial.depthWrite = false;
      gizmoMaterial.transparent = true;
      gizmoMaterial.side = THREE.FrontSide;

      var gizmoLineMaterial = new THREE.LineBasicMaterial();
      gizmoLineMaterial.depthTest = false;
      gizmoLineMaterial.depthWrite = false;
      gizmoLineMaterial.transparent = true;

      var materialInvisible = gizmoMaterial.clone();
      materialInvisible.visible = false;
      materialInvisible.transparent = false;

      var matRed = gizmoMaterial.clone();
      matRed.color.set( 0xff0000 );

      var matGreen = gizmoMaterial.clone();
      matGreen.color.set( 0x00ff00 );

      var materialBlue = gizmoMaterial.clone();
      materialBlue.color.set( 0x0000ff );

      var matWhiteTransperent = gizmoMaterial.clone();
      matWhiteTransperent.opacity = 0.25;

      var matYellowTransparent = matWhiteTransperent.clone();
      matYellowTransparent.color.set( 0xffff00 );

      var matCyanTransparent = matWhiteTransperent.clone();
      matCyanTransparent.color.set( 0x00ffff );

      var matMagentaTransparent = matWhiteTransperent.clone();
      matMagentaTransparent.color.set( 0xff00ff );

      var matYellow = gizmoMaterial.clone();
      matYellow.color.set( 0xffff00 );

      var matLineRed = gizmoLineMaterial.clone();
      matLineRed.color.set( 0xff0000 );

      var matLineGreen = gizmoLineMaterial.clone();
      matLineGreen.color.set( 0x00ff00 );

      var matLineBlue = gizmoLineMaterial.clone();
      matLineBlue.color.set( 0x0000ff );

      var matLineYellow = gizmoLineMaterial.clone();
      matLineYellow.color.set( 0xffff00 );

      var matLineGray = gizmoLineMaterial.clone();
      matLineGray.color.set( 0x787878 );

      var matLineYellowTransparent = matLineYellow.clone();
      matLineYellowTransparent.opacity = 0.25;

      // shared objects

      var planeGeometry = new THREE.PlaneBufferGeometry( 5000, 5000, 100, 100 );
      var planeMaterial = new THREE.MeshBasicMaterial( { visible: false, side: THREE.DoubleSide } );

      var arrowGeometry = new THREE.Geometry();
      var arrowMesh = new THREE.Mesh( new THREE.CylinderGeometry( 0, 0.05, 0.2, 12, 1, false ) );
      arrowMesh.position.y = 0.5;
      arrowMesh.updateMatrix();
      arrowGeometry.merge( arrowMesh.geometry, arrowMesh.matrix );

      var scaleHandleGeometry = new THREE.Geometry();
      var scaleHandleMesh = new THREE.Mesh( new THREE.BoxGeometry( 0.125, 0.125, 0.125 ) );
      scaleHandleMesh.position.y = 0.5;
      scaleHandleMesh.updateMatrix();
      scaleHandleGeometry.merge( scaleHandleMesh.geometry, scaleHandleMesh.matrix );

      var lineXGeometry = new THREE.BufferGeometry();
      lineXGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  1, 0, 0 ], 3 ) );

      var lineYGeometry = new THREE.BufferGeometry();
      lineYGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  0, 1, 0 ], 3 ) );

      var lineZGeometry = new THREE.BufferGeometry();
      lineZGeometry.addAttribute( 'position', new THREE.Float32Attribute( [ 0, 0, 0,  0, 0, 1 ], 3 ) );

      var CircleGeometry = function ( radius, facing, arc ) {
        var geometry = new THREE.BufferGeometry();
        var vertices = [];
        arc = arc ? arc : 1;
        for ( var i = 0; i <= 64 * arc; ++ i ) {
          if ( facing === 'x' ) vertices.push( 0, Math.cos( i / 32 * Math.PI ) * radius, Math.sin( i / 32 * Math.PI ) * radius );
          if ( facing === 'y' ) vertices.push( Math.cos( i / 32 * Math.PI ) * radius, 0, Math.sin( i / 32 * Math.PI ) * radius );
          if ( facing === 'z' ) vertices.push( Math.sin( i / 32 * Math.PI ) * radius, Math.cos( i / 32 * Math.PI ) * radius, 0 );
        }
        geometry.addAttribute( 'position', new THREE.Float32Attribute( vertices, 3 ) );
        return geometry;
      };

      // gizmos

      var handleGizmosTranslate = {
        X: [
          [ new THREE.Mesh( arrowGeometry, matRed ), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
          [ new THREE.Line( lineXGeometry, matLineRed ) ]
        ],
        Y: [
          [ new THREE.Mesh( arrowGeometry, matGreen ), [ 0, 0.5, 0 ] ],
          [  new THREE.Line( lineYGeometry, matLineGreen ) ]
        ],
        Z: [
          [ new THREE.Mesh( arrowGeometry, materialBlue ), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
          [ new THREE.Line( lineZGeometry, matLineBlue ) ]
        ],
        XYZ: [
          [ new THREE.Mesh( new THREE.OctahedronGeometry( 0.1, 0 ), matWhiteTransperent ), [ 0, 0, 0 ], [ 0, 0, 0 ] ]
        ],
        XY: [
          [ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.29, 0.29 ), matYellowTransparent ), [ 0.15, 0.15, 0 ] ]
        ],
        YZ: [
          [ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.29, 0.29 ), matCyanTransparent ), [ 0, 0.15, 0.15 ], [ 0, Math.PI / 2, 0 ] ]
        ],
        XZ: [
          [ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.29, 0.29 ),matMagentaTransparent ), [ 0.15, 0, 0.15 ], [ - Math.PI / 2, 0, 0 ] ]
        ]
      };

      var pickerGizmosTranslate = {
        X: [
          [ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), materialInvisible ), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
        ],
        Y: [
          [ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), materialInvisible ), [ 0, 0.6, 0 ] ]
        ],
        Z: [
          [ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), materialInvisible ), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
        ],
        XYZ: [
          [ new THREE.Mesh( new THREE.OctahedronGeometry( 0.2, 0 ), materialInvisible ) ]
        ],
        XY: [
          [ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.4, 0.4 ), materialInvisible ), [ 0.2, 0.2, 0 ] ]
        ],
        YZ: [
          [ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.4, 0.4 ), materialInvisible ), [ 0, 0.2, 0.2 ], [ 0, Math.PI / 2, 0 ] ]
        ],
        XZ: [
          [ new THREE.Mesh( new THREE.PlaneBufferGeometry( 0.4, 0.4 ), materialInvisible ), [ 0.2, 0, 0.2 ], [ - Math.PI / 2, 0, 0 ] ]
        ]
      };

      var handleGizmosRotate = {
        X: [
          [ new THREE.Line( new CircleGeometry( 1, 'x', 0.5 ), matLineRed ) ]
        ],
        Y: [
          [ new THREE.Line( new CircleGeometry( 1, 'y', 0.5 ), matLineGreen ) ]
        ],
        Z: [
          [ new THREE.Line( new CircleGeometry( 1, 'z', 0.5 ), matLineBlue ) ]
        ],
        E: [
          [ new THREE.Line( new CircleGeometry( 1.25, 'z', 1 ), matLineYellowTransparent ) ]
        ],
        XYZE: [
          [ new THREE.Line( new CircleGeometry( 1, 'z', 1 ), matLineGray ) ]
        ]
      };

      var pickerGizmosRotate = {
        X: [
          [ new THREE.Mesh( new THREE.TorusGeometry( 1, 0.12, 4, 12, Math.PI ), materialInvisible ), [ 0, 0, 0 ], [ 0, - Math.PI / 2, - Math.PI / 2 ] ]
        ],
        Y: [
          [ new THREE.Mesh( new THREE.TorusGeometry( 1, 0.12, 4, 12, Math.PI ), materialInvisible ), [ 0, 0, 0 ], [ Math.PI / 2, 0, 0 ] ]
        ],
        Z: [
          [ new THREE.Mesh( new THREE.TorusGeometry( 1, 0.12, 4, 12, Math.PI ), materialInvisible ), [ 0, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
        ],
        E: [
          [ new THREE.Mesh( new THREE.TorusGeometry( 1.25, 0.12, 2, 24 ), materialInvisible ) ]
        ],
        XYZE: [
          [ new THREE.Mesh( new THREE.SphereGeometry( 0.95, 8, 8 ), materialInvisible ) ]
        ]
      };

      var handleGizmosScale = {
        X: [
          [ new THREE.Mesh( scaleHandleGeometry, matRed ), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
          [ new THREE.Line( lineXGeometry, matLineRed ) ]
        ],
        Y: [
          [ new THREE.Mesh( scaleHandleGeometry, matGreen ), [ 0, 0.5, 0 ] ],
          [ new THREE.Line( lineYGeometry, matLineGreen ) ]
        ],
        Z: [
          [ new THREE.Mesh( scaleHandleGeometry, materialBlue ), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
          [ new THREE.Line( lineZGeometry, matLineBlue ) ]
        ],
        XYZ: [
          [ new THREE.Mesh( new THREE.BoxGeometry( 0.125, 0.125, 0.125 ), matWhiteTransperent ) ]
        ]
      };

      var pickerGizmosScale = {
        X: [
          [ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), materialInvisible ), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
        ],
        Y: [
          [ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), materialInvisible ), [ 0, 0.6, 0 ] ]
        ],
        Z: [
          [ new THREE.Mesh( new THREE.CylinderGeometry( 0.2, 0, 1, 4, 1, false ), materialInvisible ), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
        ],
        XYZ: [
          [ new THREE.Mesh( new THREE.BoxGeometry( 0.4, 0.4, 0.4 ), materialInvisible ) ]
        ]
      };

      var setupGizmos = function( gizmoMap ) {

        var gizmo = new THREE.Object3D();

        for ( var name in gizmoMap ) {

          var group = new THREE.Object3D();
          gizmo.add( group );
          gizmo[ name ] = group;

          for ( var i = gizmoMap[ name ].length; i --; ) {

            var object = gizmoMap[ name ][ i ][ 0 ].clone();
            var position = gizmoMap[ name ][ i ][ 1 ];
            var rotation = gizmoMap[ name ][ i ][ 2 ];

            object.name = name;

            if ( position ) object.position.set( position[ 0 ], position[ 1 ], position[ 2 ] );
            if ( rotation ) object.rotation.set( rotation[ 0 ], rotation[ 1 ], rotation[ 2 ] );

            object.updateMatrix();

            var tempGeometry = object.geometry.clone();
            tempGeometry.applyMatrix( object.matrix );
            object.geometry = tempGeometry;

            object.position.set( 0, 0, 0 );
            object.rotation.set( 0, 0, 0 );
            object.scale.set( 1, 1, 1 );

            group.add( object );

          }

        }

        return gizmo;

      };

    }

  }

  THREE.TransformGizmoControl = function ( camera, target ) {

    THREE.Control.call( this );

    this.registerProperties( {
      camera: {
        value: camera,
        type: THREE.Camera,
        observer: 'update',
        notify: true
      },
      target: {
        value: target,
        type: THREE.Object3D,
        observer: 'update',
        notify: true
      },
      mode: {
        value: 'translate',
        type: 'string',
        observer: 'updateMode',
        notify: true
      },
      size: {
        value: 1,
        type: 'number',
        observer: 'updateTransform',
        notify: true
      },
      axis: {
        value: '',
        type: 'string',
        observer: 'updateAxis',
        notify: true
      },
      space: {
        value: 'local',
        type: 'string',
        observer: 'updateTransform',
        notify: true
      }
    } );

    this.helper = new THREE.Object3D();

    this.plane = new THREE.Mesh( planeGeometry, planeMaterial );
    this.helper.add( this.plane );

    this.gnomon = new THREE.Object3D();
    this.helper.add( this.gnomon );

    this.handles = new THREE.Object3D();
    this.pickers = new THREE.Object3D();
    this.gnomon.add( this.handles );
    this.gnomon.add( this.pickers );

    this._handleModes = {
      translate: setupGizmos( handleGizmosTranslate ),
      rotate: setupGizmos( handleGizmosRotate ),
      scale: setupGizmos( handleGizmosScale )
    };

    this._pickerModes = {
      translate: setupGizmos( pickerGizmosTranslate ),
      rotate: setupGizmos( pickerGizmosRotate ),
      scale: setupGizmos( pickerGizmosScale )
    };

    // transformations

    this.position = new THREE.Vector3();
    this.scale  = new THREE.Vector3();
    this.quaternion  = new THREE.Quaternion();
    this.eye = new THREE.Vector3();
    this.alignVector = new THREE.Vector3();

    this.addEventListener( 'targetchange', this.update.bind( this ) );

  };

  THREE.TransformGizmoControl.prototype = Object.create( THREE.Control.prototype );
  THREE.TransformGizmoControl.prototype.constructor = THREE.TransformGizmoControl;

  THREE.TransformGizmoControl.prototype.update = function () {

    this.debounce( 'update', function () {

      this.updateTransform();

      this.updateVisibility();

    }.bind( this ) );

  };

  THREE.TransformGizmoControl.prototype.updateTransform = function () {

    if ( !this.camera || !this.target ) return;

    this.target.updateMatrixWorld();
    this.camera.updateMatrixWorld();

    this.position.setFromMatrixPosition( this.target.matrixWorld );
    this.scale.setFromMatrixScale( this.target.matrixWorld );
    this.quaternion.set( 0, 0, 0, 1 );

    if ( this.space === 'local' ) {

      tempMatrix.extractRotation( this.target.matrixWorld );
      this.quaternion.setFromRotationMatrix( tempMatrix );

    }

    if ( this.camera instanceof THREE.OrthographicCamera ) {

      scale = ( this.camera.top - this.camera.bottom ) / 3 * this.size;
      this.eye.copy( unitZ ).applyMatrix4( tempMatrix.extractRotation( this.camera.matrixWorld ) ).normalize();

    } else {

      tempVector.setFromMatrixPosition( this.camera.matrixWorld ).sub( this.position );
      scale = tempVector.length() / 6 * this.size;
      this.eye.copy( tempVector ).normalize();

    }

    // this.lookAtMatrix.lookAt( this.eye, unit0, unitY );

    this.helper.position.copy( this.position );
    this.helper.scale.set( scale, scale, scale );

    // TODO: check math
    this.alignVector.copy( this.eye ).applyQuaternion( tempQuaternion.copy( this.quaternion ).inverse() );

    this.gnomon.traverse( function( child ) {

      if ( child.name.search( 'E' ) !== - 1 ) {

        tempMatrix.lookAt( this.eye, unit0, unitY );
        child.quaternion.setFromRotationMatrix( tempMatrix );

      } else if ( child.name !== '' ) {

        child.quaternion.copy( this.quaternion );

      }

      if ( this.mode === 'rotate' ) {

        if ( child.name === 'X' ) {

          tempQuaternion.setFromAxisAngle( unitX, Math.atan2( - this.alignVector.y, this.alignVector.z ) );
          tempQuaternion.multiplyQuaternions( this.quaternion, tempQuaternion );
          child.quaternion.copy( tempQuaternion );

        }

        if ( child.name === 'Y' ) {

          tempQuaternion.setFromAxisAngle( unitY, Math.atan2( this.alignVector.x, this.alignVector.z ) );
          tempQuaternion.multiplyQuaternions( this.quaternion, tempQuaternion );
          child.quaternion.copy( tempQuaternion );

        }

        if ( child.name === 'Z' ) {

          tempQuaternion.setFromAxisAngle( unitZ, Math.atan2( this.alignVector.y, this.alignVector.x ) );
          tempQuaternion.multiplyQuaternions( this.quaternion, tempQuaternion );
          child.quaternion.copy( tempQuaternion );

        }

      }

    }.bind( this ) );

    this.dispatchEvent( changeEvent );

  };

  THREE.TransformGizmoControl.prototype.updateVisibility = function () {

    if ( !this.camera || !this.target ) {
      this.helper.visible = false;
      return;
    }

    this.helper.visible = true;

    // this.alignVector.copy( this.eye ).applyQuaternion( tempQuaternion.copy( this.quaternion ).inverse() );

    this.gnomon.traverse( function( child ) {

      child.visible = true;

      // hide aligned to camera

      if ( this.mode == 'translate' || this.mode === 'scale' ) {

        if ( Math.abs( this.alignVector.x ) > 0.99 ) {

          if ( child.name === 'X' || child.name === 'XY' || child.name === 'XZ' ) {

            child.visible = false;

          }

        } else if ( Math.abs( this.alignVector.y ) > 0.99 ) {

          if ( child.name === 'Y' || child.name === 'XY' || child.name === 'YZ' ) {

            child.visible = false;

          }

        } else if ( Math.abs( this.alignVector.z ) > 0.99 ) {

          if ( child.name === 'Z' || child.name === 'XZ' || child.name === 'YZ' ) {

            child.visible = false;

          }

        }

      } else if ( this.mode == 'rotate' ) {

        if ( Math.abs( this.alignVector.x ) < 0.1 ) {

          if ( child.name === 'X' ) {

            child.visible = false;

          }

        } else if ( Math.abs( this.alignVector.y ) < 0.1 ) {

          if ( child.name === 'Y' ) {

            child.visible = false;

          }

        } else if ( Math.abs( this.alignVector.z ) < 0.1 ) {

          if ( child.name === 'Z' ) {

            child.visible = false;

          }

        }

      }

    }.bind( this ) );

    this.dispatchEvent( changeEvent );

  };

  THREE.TransformGizmoControl.prototype.updatePlaneOrientation = function () {

    if ( this.axis === '' ) return;

    if ( this.axis === 'X' ) this.plane.lookAt( unitX );

    if ( this.axis === 'Y' ) this.plane.lookAt( unitY );

    if ( this.axis === 'Z' ) this.plane.lookAt( unitZ );

    if ( this.axis === 'XY' ) this.plane.lookAt( unitZ );

    if ( this.axis === 'YZ' ) this.plane.lookAt( unitX );

    if ( this.axis === 'XZ' ) this.plane.lookAt( unitY );

    if ( this.axis === 'XYZ' ) this.plane.lookAt( this.eye );

    if ( this.mode === 'translate' || this.mode === 'scale' ) {

      if ( this.axis === 'X' ) {

        this.plane.lookAt( unitZ );

        if ( Math.abs( this.alignVector.x ) > Math.abs( this.alignVector.z ) ) this.plane.lookAt( unitY );

      }

      if ( this.axis === 'Y' ) {

        this.plane.lookAt( unitZ );

        if ( Math.abs( this.alignVector.x ) > Math.abs( this.alignVector.z ) ) this.plane.lookAt( unitX );

      }

      if ( this.axis === 'Z' ) {

        this.plane.lookAt( unitY );

        if ( Math.abs( this.alignVector.x ) > Math.abs( this.alignVector.y ) ) this.plane.lookAt( unitX );

      }

    }

    if ( this.axis === 'E' || this.mode === 'rotate' ) {

      this.plane.lookAt( this.eye );

    } else if ( this.space === 'local' ) {

      tempQuaternion.copy( this.plane.quaternion );
      this.plane.quaternion.copy( this.quaternion ).multiply( tempQuaternion );

    }

  };

  THREE.TransformGizmoControl.prototype.updateAxis = function () {

    this.handles.traverse( function( child ) {

      if ( child.material ) {

        child.material.oldColor = child.material.oldColor || child.material.color.clone();
        child.material.oldOpacity = child.material.oldOpacity || child.material.opacity;

        if ( child.name === this.axis ) {

          child.material.color.setRGB( 1, 1, 0 );
          child.material.opacity = 1;

        } else {

          child.material.color.copy( child.material.oldColor );
          child.material.opacity = child.material.oldOpacity;

        }

      }

    }.bind( this ) );

    this.updatePlaneOrientation();

    this.dispatchEvent( changeEvent );

  };

  THREE.TransformGizmoControl.prototype.updateMode = function () {

    for ( var i = this.gnomon.children.length; i--; ) {
      this.gnomon.remove( this.gnomon.children[ i ] );
    }

    if ( !this.mode ) return;

    this.handles = this._handleModes[ this.mode ];
    this.pickers = this._pickerModes[ this.mode ];

    this.gnomon.add( this.handles );
    this.gnomon.add( this.pickers );
    this.gnomon.add( this.plane );

    this.updatePlaneOrientation();

    this.dispatchEvent( changeEvent );

  };

  THREE.TransformGizmoControl.prototype.setAxisFromPointer = function ( pointer ) {

    if ( !this.camera || !this.target ) return;

    ray.setFromCamera( pointer.position, this.camera );
    intersect = ray.intersectObjects( [ this.pickers ], true )[ 0 ];

    var axis;

    if ( intersect && intersect.object.name ) {
      if ( intersect.object.name !== this.axis ) {
        this.axis = intersect.object.name;
      }
    } else {
      this.axis = '';
    }

  };

  THREE.TransformGizmoControl.prototype.getPointOnPlane = function ( pointer ) {

    if ( !this.camera || !this.target ) return;

    ray.setFromCamera( pointer.position, this.camera );
    intersect = ray.intersectObjects( [ this.plane ] )[ 0 ];

    if ( intersect ) return intersect.point;

  };

}() );

/**
 * @author arodic / https://github.com/arodic
 */
 /*jshint sub:true*/

( function () {

	THREE.TransformControls = function ( camera, domElement ) {

		// TODO: Make non-uniform scale and rotate play nice in hierarchies
		// TODO: ADD RXYZ contol

		THREE.Object3D.call( this );

		domElement = ( domElement !== undefined ) ? domElement : document;

		this.enabled = true;
		this.object = undefined;
		this.visible = false;
		this.translationSnap = null;
		this.rotationSnap = null;
		this.space = "world";
		this.size = 1;
		this.axis = null;

		var scope = this;

		var _mode = "translate";
		var _dragging = false;
		var _plane = "XY";
		var _gizmo = {
			"translate": new THREE.TransformGizmoTranslate(),
			"rotate": new THREE.TransformGizmoRotate(),
			"scale": new THREE.TransformGizmoScale()
		};

		for ( var type in _gizmo ) {

			var gizmoObj = _gizmo[ type ];

			gizmoObj.visible = ( type === _mode );
			this.add( gizmoObj );

		}

		var changeEvent = { type: "change" };
		var mouseDownEvent = { type: "mouseDown" };
		var mouseUpEvent = { type: "mouseUp", mode: _mode };
		var objectChangeEvent = { type: "objectChange" };

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

		this.dispose = function () {

			domElement.removeEventListener( "mousedown", onPointerDown );
			// domElement.removeEventListener( "touchstart", onPointerDown );
			//
			domElement.removeEventListener( "mousemove", onPointerHover );
			// domElement.removeEventListener( "touchmove", onPointerHover );
			//
			// domElement.removeEventListener( "mousemove", onPointerMove );
window.removeEventListener( "mousemove", onPointerMove );
			// domElement.removeEventListener( "touchmove", onPointerMove );
			//
			window.removeEventListener( "mouseup", onPointerUp );
			// domElement.removeEventListener( "mouseout", onPointerUp );
			// domElement.removeEventListener( "touchend", onPointerUp );
			// domElement.removeEventListener( "touchcancel", onPointerUp );
			// domElement.removeEventListener( "touchleave", onPointerUp );

		};

		this.setDomElement = function ( element ) {

			this.dispose();

			domElement = element;

			domElement.addEventListener( "mousedown", onPointerDown );
			// domElement.addEventListener( "touchstart", onPointerDown );
			//
			domElement.addEventListener( "mousemove", onPointerHover );
			// domElement.addEventListener( "touchmove", onPointerHover );
			//
			// domElement.addEventListener( "mousemove", onPointerMove );
window.addEventListener( "mousemove", onPointerMove );
			// domElement.addEventListener( "touchmove", onPointerMove );
			//
			window.addEventListener( "mouseup", onPointerUp );
			// domElement.addEventListener( "mouseout", onPointerUp );
			// domElement.addEventListener( "touchend", onPointerUp );
			// domElement.addEventListener( "touchcancel", onPointerUp );
			// domElement.addEventListener( "touchleave", onPointerUp );

		};

		this.setDomElement( domElement );

		this.setCamera = function ( newCamera ) {

			camera = newCamera;

			scope.dispatchEvent( changeEvent );

		}

		this.attach = function ( object ) {

			this.object = object;
			this.visible = true;
			this.update();

		};

		this.detach = function () {

			this.object = undefined;
			this.visible = false;
			this.axis = null;

		};

		this.setMode = function ( mode ) {

			_mode = mode ? mode : _mode;

			if ( _mode === "scale" ) scope.space = "local";

			for ( var type in _gizmo ) _gizmo[ type ].visible = ( type === _mode );

			this.update();
			scope.dispatchEvent( changeEvent );

		};

		this.setTranslationSnap = function ( translationSnap ) {

			scope.translationSnap = translationSnap;

		};

		this.setRotationSnap = function ( rotationSnap ) {

			scope.rotationSnap = rotationSnap;

		};

		this.setSize = function ( size ) {

			scope.size = size;
			this.update();
			scope.dispatchEvent( changeEvent );

		};

		this.setSpace = function ( space ) {

			scope.space = space;
			this.update();
			scope.dispatchEvent( changeEvent );

		};

		this.update = function () {

			if ( scope.object === undefined ) return;

			scope.object.updateMatrixWorld();
			worldPosition.setFromMatrixPosition( scope.object.matrixWorld );
			worldRotation.setFromRotationMatrix( tempMatrix.extractRotation( scope.object.matrixWorld ) );

			camera.updateMatrixWorld();
			camPosition.setFromMatrixPosition( camera.matrixWorld );
			camRotation.setFromRotationMatrix( tempMatrix.extractRotation( camera.matrixWorld ) );

			if ( camera.type === 'OrthographicCamera' ) {

				scale = ( camera.top - camera.bottom ) / 3 * scope.size;

			} else {

				scale = worldPosition.distanceTo( camPosition ) / 6 * scope.size;

			}

			this.position.copy( worldPosition );
			this.scale.set( scale, scale, scale );

			eye.copy( camPosition ).sub( worldPosition ).normalize();

			if ( scope.space === "local" ) {

				_gizmo[ _mode ].update( worldRotation, eye );

			} else if ( scope.space === "world" ) {

				_gizmo[ _mode ].update( new THREE.Euler(), eye );

			}

			_gizmo[ _mode ].highlight( scope.axis );

		};

		function onPointerHover( event ) {

			if ( scope.enabled === false ) return;

			if ( scope.object === undefined || _dragging === true || ( event.button !== undefined && event.button !== 0 ) ) return;

			var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;

			var intersect = intersectObjects( pointer, _gizmo[ _mode ].pickers.children );

			var axis = null;

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

		function onPointerDown( event ) {

			if ( scope.enabled === false ) return;

			if ( scope.object === undefined || _dragging === true || ( event.button !== undefined && event.button !== 0 ) ) return;

			var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;

			if ( pointer.button === 0 || pointer.button === undefined ) {

				var intersect = intersectObjects( pointer, _gizmo[ _mode ].pickers.children );

				if ( intersect ) {

					event.preventDefault();
					event.stopPropagation();

					scope.dispatchEvent( mouseDownEvent );

					scope.axis = intersect.object.name;

					scope.update();

					eye.copy( camPosition ).sub( worldPosition ).normalize();

					_gizmo[ _mode ].setActivePlane( scope.axis, eye );

					var planeIntersect = intersectObjects( pointer, [ _gizmo[ _mode ].activePlane ] );

					if ( planeIntersect ) {

						oldPosition.copy( scope.object.position );
						oldScale.copy( scope.object.scale );

						oldRotationMatrix.extractRotation( scope.object.matrix );
						worldRotationMatrix.extractRotation( scope.object.matrixWorld );

						parentRotationMatrix.extractRotation( scope.object.parent.matrixWorld );
						parentScale.setFromMatrixScale( tempMatrix.getInverse( scope.object.parent.matrixWorld ) );

						offset.copy( planeIntersect.point );

					}

				}

			}

			_dragging = true;
			if (scope.axis) document.body.appendChild(stopper);

		}

		function onPointerMove( event ) {

			if ( scope.enabled === false ) return;

			if ( scope.object === undefined || scope.axis === null || _dragging === false || ( event.button !== undefined && event.button !== 0 ) ) return;

			var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;

			var planeIntersect = intersectObjects( pointer, [ _gizmo[ _mode ].activePlane ] );

			if ( planeIntersect === false ) return;

			event.preventDefault();
			event.stopPropagation();

			point.copy( planeIntersect.point );

			if ( _mode === "translate" ) {

				point.sub( offset );
				point.multiply( parentScale );

				if ( scope.space === "local" ) {

					point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

					if ( scope.axis.search( "X" ) === - 1 ) point.x = 0;
					if ( scope.axis.search( "Y" ) === - 1 ) point.y = 0;
					if ( scope.axis.search( "Z" ) === - 1 ) point.z = 0;

					point.applyMatrix4( oldRotationMatrix );

					scope.object.position.copy( oldPosition );
					scope.object.position.add( point );

				}

				if ( scope.space === "world" || scope.axis.search( "XYZ" ) !== - 1 ) {

					if ( scope.axis.search( "X" ) === - 1 ) point.x = 0;
					if ( scope.axis.search( "Y" ) === - 1 ) point.y = 0;
					if ( scope.axis.search( "Z" ) === - 1 ) point.z = 0;

					point.applyMatrix4( tempMatrix.getInverse( parentRotationMatrix ) );

					scope.object.position.copy( oldPosition );
					scope.object.position.add( point );

				}

				if ( scope.translationSnap !== null ) {

					if ( scope.space === "local" ) {

						scope.object.position.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

					}

					if ( scope.axis.search( "X" ) !== - 1 ) scope.object.position.x = Math.round( scope.object.position.x / scope.translationSnap ) * scope.translationSnap;
					if ( scope.axis.search( "Y" ) !== - 1 ) scope.object.position.y = Math.round( scope.object.position.y / scope.translationSnap ) * scope.translationSnap;
					if ( scope.axis.search( "Z" ) !== - 1 ) scope.object.position.z = Math.round( scope.object.position.z / scope.translationSnap ) * scope.translationSnap;

					if ( scope.space === "local" ) {

						scope.object.position.applyMatrix4( worldRotationMatrix );

					}

				}

			} else if ( _mode === "scale" ) {

				point.sub( offset );
				point.multiply( parentScale );

				if ( scope.space === "local" ) {

					if ( scope.axis === "XYZ" ) {

						scale = 1 + ( ( point.y ) / 50 );

						scope.object.scale.x = oldScale.x * scale;
						scope.object.scale.y = oldScale.y * scale;
						scope.object.scale.z = oldScale.z * scale;

					} else {

						point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

						if ( scope.axis === "X" ) scope.object.scale.x = oldScale.x * ( 1 + point.x / 50 );
						if ( scope.axis === "Y" ) scope.object.scale.y = oldScale.y * ( 1 + point.y / 50 );
						if ( scope.axis === "Z" ) scope.object.scale.z = oldScale.z * ( 1 + point.z / 50 );

					}

				}

			} else if ( _mode === "rotate" ) {

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

					scope.object.quaternion.copy( tempQuaternion );

				} else if ( scope.axis === "XYZE" ) {

					quaternionE.setFromEuler( point.clone().cross( tempVector ).normalize() ); // rotation axis

					tempQuaternion.setFromRotationMatrix( tempMatrix.getInverse( parentRotationMatrix ) );
					quaternionX.setFromAxisAngle( quaternionE, - point.clone().angleTo( tempVector ) );
					quaternionXYZ.setFromRotationMatrix( worldRotationMatrix );

					tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionX );
					tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionXYZ );

					scope.object.quaternion.copy( tempQuaternion );

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

					scope.object.quaternion.copy( quaternionXYZ );

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

					scope.object.quaternion.copy( tempQuaternion );

				}

			}

			scope.update();
			scope.dispatchEvent( changeEvent );
			scope.dispatchEvent( objectChangeEvent );

		}

		function onPointerUp( event ) {

			if ( scope.enabled === false ) return;

			if ( event.button !== undefined && event.button !== 0 ) return;

			if ( _dragging && ( scope.axis !== null ) ) {

				mouseUpEvent.mode = _mode;
				scope.dispatchEvent( mouseUpEvent )

			}

			_dragging = false;
			if (stopper.parentNode == document.body) {
				document.body.removeChild(stopper);
			}
			onPointerHover( event );

		}

		function intersectObjects( pointer, objects ) {

			var rect = domElement.getBoundingClientRect();
			var x = ( pointer.clientX - rect.left ) / rect.width;
			var y = ( pointer.clientY - rect.top ) / rect.height;

			pointerVector.set( ( x * 2 ) - 1, - ( y * 2 ) + 1 );
			ray.setFromCamera( pointerVector, camera );

			var intersections = ray.intersectObjects( objects, true );
			return intersections[ 0 ] ? intersections[ 0 ] : false;

		}

	};

	THREE.TransformControls.prototype = Object.create( THREE.Object3D.prototype );
	THREE.TransformControls.prototype.constructor = THREE.TransformControls;

}() );

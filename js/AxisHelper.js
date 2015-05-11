/**
 * @author sroucheray / http://sroucheray.org/
 * @author mrdoob / http://mrdoob.com/
 * @author arodic / http://akirodic.com/
 */

THREE.AxisHelper = function ( size, labelSize ) {

    THREE.Object3D.call( this );

    size = size || 1;
    labelSize = labelSize || 16;

    var vertices = new Float32Array( [
        0, 0, 0,  size, 0, 0,
        0, 0, 0,  0, size, 0,
        0, 0, 0,  0, 0, size
    ] );

    var colors = new Float32Array( [
        1, 0, 0,  1, 0.6, 0,
        0, 1, 0,  0.6, 1, 0,
        0, 0, 1,  0, 0.6, 1
    ] );

    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );

    var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

    var axes = new THREE.Line( geometry, material, THREE.LineSegments );
    this.add( axes );

    var labelX = new THREE.LabelHelper( 'x', labelSize, 'red');
    labelX.position.set( size, 0, 0 );
    axes.add( labelX );

    var labelY = new THREE.LabelHelper( 'y', labelSize, 'green');
    labelY.position.set( 0, size, 0 );
    axes.add( labelY );

    var labelZ = new THREE.LabelHelper( 'z', labelSize, 'blue');
    labelZ.position.set( 0, 0, size );
    axes.add( labelZ );

};

THREE.AxisHelper.prototype = Object.create( THREE.Object3D.prototype );
THREE.AxisHelper.prototype.constructor = THREE.AxisHelper;

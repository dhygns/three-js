/**
 * @author arodic / http://akirodic.com/
 */

// TODO(aki): allow longer labels. Only one letter currently supported

THREE.LabelHelper = function ( label, size, color ) {

    var canvas, geometry, ctx, texture, material;

    geometry = new THREE.Geometry();
    geometry.vertices.push( new THREE.Vector3() );

    canvas = document.createElement( 'canvas' );
    canvas.width = size;
    canvas.height = size;

    ctx = canvas.getContext( '2d' );
    ctx.font = size + 'px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText( label, size / 2, size / 2 );

    texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.premultiplyAlpha = true;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;

    material = new THREE.PointCloudMaterial(
        { size: size, sizeAttenuation: false, map: texture, transparent: true, color: color } );
    material.blendSrc = THREE.OneFactor;
    material.blending = THREE.CustomBlending;

    THREE.PointCloud.call( this, geometry, material );

};

THREE.LabelHelper.prototype = Object.create( THREE.PointCloud.prototype );
THREE.LabelHelper.prototype.constructor = THREE.LabelHelper;

"""Build ground studies and embedded textures without opening existing Blender files."""
import bpy
import json
import base64
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'environment'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
source=(ROOT/'assets/grandstands/grandstand-models.js').read_text(encoding='utf8')
stands=json.loads(source.split('const SC_GRANDSTANDS = ',1)[1].rstrip().removesuffix(';'))
rng=np.random.default_rng(9173)
n=512
y,x=np.mgrid[0:n,0:n]
u,v=x/n,y/n
textures={}
materials={}
for name in ['grass','concrete']:
    pixels=np.ones((n,n,4),dtype=np.float32)
    if name=='grass':
        # Periodic low-contrast mowing variation and fine turf, no billboard blades.
        variation=.009*np.cos(2*np.pi*u)+.004*np.sin(4*np.pi*v+2*np.pi*u)
        variation+=rng.normal(0,.010,(n,n))
        pixels[:,:,:3]=np.clip(np.array([.13,.205,.07])+variation[:,:,None]*[.65,1,.4],0,1)
    else:
        variation=rng.normal(0,.004,(n,n))
        # A fine expansion joint at the tile boundary, matching across repeats.
        edge=np.minimum.reduce([x,n-1-x,y,n-1-y])
        variation-=.042*np.exp(-(edge/1.1)**2)
        pixels[:,:,:3]=np.clip(np.array([.35,.354,.342])+variation[:,:,None],0,1)
    image=bpy.data.images.new(name,width=n,height=n,alpha=True)
    image.colorspace_settings.name='Non-Color'
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw=str(OUT/(name+'.png')); image.file_format='PNG'; image.save(); image.pack()
    textures[name]='data:image/png;base64,'+base64.b64encode((OUT/(name+'.png')).read_bytes()).decode()
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value=.95
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=image
    mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    materials[name]=mat

def point(p): return (p[0],-p[2],p[1])

models={}
for series,stand in stands['models'].items():
    scene=bpy.data.scenes.new(series+' ground study')
    bpy.context.window.scene=scene
    xs=[p for g in stand['parts'].values() for p in g['position'][::3]]
    front=stand['frontX']+min(xs)-.6
    back=stand['frontX']+max(xs)+1.2
    parts={name:{'position':[],'normal':[],'uv':[],'index':[]} for name in materials}
    for side in [-1,1]:
        for name,a,b in [('grass',11.2,front),('concrete',front,back),('grass',back,6000)]:
            a,b=sorted([side*a,side*b]); height=-.025 if name=='grass' else -.015
            g=parts[name]; offset=len(g['position'])//3
            vertices=[(a,height,0),(a,height,60),(b,height,60),(b,height,0)]
            tile=10 if name=='grass' else 6
            for px,py,pz in vertices:
                g['position'] += [px,py,pz]; g['normal'] += [0,1,0]; g['uv'] += [px/tile,pz/tile]
            g['index'] += [offset+i for i in [0,1,2,0,2,3]]
    models[series]={'frontX':front,'backX':back,'parts':parts}
    for name,g in parts.items():
        # Editable Blender source is the same mesh exported to the runtime.
        data=bpy.data.meshes.new(name)
        verts=[point(g['position'][i:i+3]) for i in range(0,len(g['position']),3)]
        faces=[g['index'][i:i+3] for i in range(0,len(g['index']),3)]
        data.from_pydata(verts,[],faces); data.update()
        uv=data.uv_layers.new(name='UVMap')
        for loop in data.loops: uv.data[loop.index].uv=g['uv'][loop.vertex_index*2:loop.vertex_index*2+2]
        ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob); data.materials.append(materials[name])
    # Read-only context geometry makes the concrete footprint inspectable in Blender.
    for name,g in stand['parts'].items():
        if name=='crowd': continue
        data=bpy.data.meshes.new('Reference '+name)
        verts=[point((g['position'][i]+stand['frontX'],*g['position'][i+1:i+3])) for i in range(0,len(g['position']),3)]
        data.from_pydata(verts,[],[g['index'][i:i+3] for i in range(0,len(g['index']),3)]); data.update()
        ob=bpy.data.objects.new('Stand reference '+name,data); scene.collection.objects.link(ob)
        mat=bpy.data.materials.new('Reference '+name); mat.use_nodes=True
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*stands['materials'][name],1)
        data.materials.append(mat)
    scene.world=bpy.data.worlds.new('Clear midday'); scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.65,.8,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    sun_data=bpy.data.lights.new('Inspection daylight','SUN'); sun_data.energy=2
    sun=bpy.data.objects.new('Inspection daylight',sun_data); scene.collection.objects.link(sun); sun.rotation_euler=(.35,-.4,-.5)
    camera=bpy.data.objects.new('Inspection',bpy.data.cameras.new('Inspection')); scene.collection.objects.link(camera); scene.camera=camera
    camera.location=point((-35,stand['height']*.7+28,-48))
    target=Vector(point(((front+back)/2,stand['height']*.25,25)))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.lens=34
    scene.render.engine='CYCLES'; scene.cycles.samples=12; scene.cycles.use_denoising=True
    scene.render.resolution_x=1100; scene.render.resolution_y=800; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(OUT/(series+'-ground.png'))
    bpy.ops.render.render(write_still=True)

bpy.context.window.scene=bpy.data.scenes['challenger ground study']
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'speedway-environment.blend'))
payload={'version':1,'moduleLength':60,'models':models,'textures':textures,
         'sky':{'horizon':'#bdd6e5','zenith':'#679dca'}}
(OUT/'environment-model.js').write_text('// Generated by tools/build_environment.py. Original ground and texture artwork.\nconst SC_ENVIRONMENT = '+json.dumps(payload,separators=(',',':'))+';\n',encoding='utf8')
print('Environment rebuilt: three ground footprints, two embedded textures, clear midday sky.',flush=True)

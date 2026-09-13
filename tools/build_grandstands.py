"""Original series grandstands, built in a separate Blender process.
Writes only assets/grandstands; never loads the user's open Blender file.
Game coordinates X across, Y up, Z forward. One right-side 60-unit module.
"""
import bpy
import bmesh
import json
import math
import base64
import argparse
import sys
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'grandstands'
OUT.mkdir(parents=True, exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--series',choices=['grassroots','challenger','premier'])
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
existing={}
if args.series:
    source=(OUT/'grandstand-models.js').read_text(encoding='utf8')
    existing=json.loads(source.split('const SC_GRANDSTANDS = ',1)[1].rstrip().removesuffix(';'))
bpy.ops.wm.read_factory_settings(use_empty=True)
LENGTH = 60
PALETTE = {'concrete':(.46,.48,.49), 'aluminum':(.64,.68,.70),
           'steel':(.16,.20,.23), 'seats':(.075,.16,.24),
           'glass':(.09,.22,.28), 'trim':(.68,.72,.73), 'crowd':(1,1,1)}
M = {}
for key,color in PALETTE.items():
    mat=bpy.data.materials.new(key); mat.diffuse_color=(*color,1); mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=.8
    M[key]=mat

# A repeatable, original row of seated spectators, not random confetti on a wall.
# Transparent gaps leave the actual benches/risers visible.
rng=np.random.default_rng(3914)
h,w=64,1024
pixels=np.zeros((h,w,4),dtype=np.float32)
clothes=[(.44,.13,.12),(.13,.25,.39),(.61,.57,.45),(.27,.36,.25),(.65,.40,.14),(.27,.23,.33)]
skins=[(.57,.35,.23),(.77,.56,.40),(.35,.22,.17)]
for i in range(64):
    if rng.random()<.2: continue
    x=i*16+int(rng.integers(1,4))
    pixels[6:35,x:x+10,:3]=clothes[int(rng.integers(len(clothes)))]; pixels[6:35,x:x+10,3]=1
    pixels[35:49,x+2:x+8,:3]=skins[int(rng.integers(len(skins)))]; pixels[35:49,x+2:x+8,3]=1
    pixels[46:51,x+1:x+9,:3]=(.10,.12,.14); pixels[46:51,x+1:x+9,3]=1
image=bpy.data.images.new('Seated crowd',width=w,height=h,alpha=True)
image.pixels.foreach_set(pixels.ravel()); image.filepath_raw=str(OUT/'seated-crowd.png'); image.file_format='PNG'
if not args.series: image.save()
image.pack()
bs=M['crowd'].node_tree.nodes.get('Principled BSDF')
node=M['crowd'].node_tree.nodes.new('ShaderNodeTexImage'); node.image=image
M['crowd'].node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
M['crowd'].node_tree.links.new(node.outputs['Alpha'],bs.inputs['Alpha'])
M['crowd'].surface_render_method='DITHERED'

def point(p): return (p[0],-p[2],p[1])
parts=[]
def mesh(name,verts,faces,mat,uvs=None):
    data=bpy.data.meshes.new(name); data.from_pydata([point(p) for p in verts],[],faces); data.update()
    if uvs:
        uv=data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for li in poly.loop_indices: uv.data[li].uv=uvs[data.loops[li].vertex_index]
    bm=bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(data); bm.free()
    ob=bpy.data.objects.new(name,data); collection.objects.link(ob); data.materials.append(M[mat]); ob['component']=mat; parts.append(ob)
    return ob

def box(name,pos,size,mat):
    px,py,pz=pos; a,b,c=[v/2 for v in size]
    v=[(px+x,py+y,pz+z) for x,y,z in [(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]]
    return mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,4,7,3),(1,2,6,5)],mat)

def beam(name,a,b,width,mat='steel'):
    pa,pb=Vector(a),Vector(b); direction=(pb-pa).normalized()
    ref=Vector((0,1,0)) if abs(direction.y)<.9 else Vector((0,0,1))
    u=direction.cross(ref).normalized()*width/2; v=direction.cross(u).normalized()*width/2
    verts=[tuple(p+s*u+t*v) for p in [pa,pb] for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    return mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,4,7,3),(1,2,6,5)],mat)

SPECS=[
 {'id':'grassroots','name':'Local short-track bleachers','frontX':20,'decks':[(0,1.3,8,.72,.46)],'pitch':78},
 {'id':'challenger','name':'Two-deck collegiate grandstand','frontX':24,'decks':[(0,2.8,14,.88,.56),(4,15.5,16,.88,.56)],'pitch':60},
 # Upper decks sit behind the previous seating rake, not above its front rows.
 {'id':'premier','name':'Four-deck premier stadium','frontX':28,'decks':[(0,3.5,16,1.05,.68),(18,17.1,18,1.05,.68),(39,32.06,20,1.05,.68),(62,48.38,22,1.05,.68)],'pitch':60}
]
models=existing.get('models',{})
for spec in SPECS:
    if args.series and spec['id']!=args.series: continue
    # Only generated objects in this isolated process are removed. Each saved
    # document contains one series, without hidden copies of earlier studies.
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob,do_unlink=True)
    for old_collection in list(bpy.data.collections): bpy.data.collections.remove(old_collection)
    collection=bpy.data.collections.new(spec['name']); bpy.context.scene.collection.children.link(collection)
    parts=[]; grass=spec['id']=='grassroots'; premier=spec['id']=='premier'
    for deck,(start,base,rows,tread,rise) in enumerate(spec['decks']):
        prefix=f'Deck {deck+1} '
        end=start+rows*tread; top=base+(rows-1)*rise
        for row in range(rows):
            x=start+row*tread; y=base+row*rise
            for z0,z1 in [(1,14),(16,29),(31,44),(46,59)]:
                # Exposed tread and separate bench seat; stadium decks also have seat backs.
                box(prefix+'tread',(x+tread/2,y,(z0+z1)/2),(tread,.14,z1-z0),'aluminum' if grass else 'concrete')
                box(prefix+'bench',(x+tread*.7,y+.36,(z0+z1)/2),(tread*.38,.10,z1-z0),'aluminum' if grass else 'seats')
                if not grass: box(prefix+'seat back',(x+tread*.87,y+.57,(z0+z1)/2),(.085,.36,z1-z0),'seats')
                # One alpha-tested row strip; no thousands of individual person draw calls.
                crowd_x=x+tread*.63
                mesh(prefix+'seated spectators',[(crowd_x,y+.38,z0),(crowd_x,y+.38,z1),(crowd_x,y+1.15,z1),(crowd_x,y+1.15,z0)],
                     [(0,1,2,3)],'crowd',[(z0/48,0),(z1/48,0),(z1/48,1),(z0/48,1)])
            for z in [15,30,45]:
                for sub in range(2): box(prefix+'aisle step',(x+tread*(sub+.5)/2,y-rise/2+sub*rise/2,z),(tread/2,.12,1.8),'aluminum' if grass else 'concrete')
        # Perimeter rails and aisle handrails are real geometry.
        for x,y in [(start,base+.95),(end,top+1.2)]:
            for height in [0,-.5]: beam(prefix+'guardrail',(x,y+height,.6),(x,y+height,59.4),.075,'aluminum')
            for z in [1,15,30,45,59]: beam(prefix+'rail post',(x,y-1,z),(x,y,z),.075,'aluminum')
        for z in [15,30,45]:
            beam(prefix+'aisle handrail',(start,base+.9,z),(end,top+.9,z),.075,'aluminum')
            for row in range(0,rows,4):
                x=start+row*tread; y=base+row*rise
                beam(prefix+'aisle post',(x,y,z),(x,y+.95,z),.075,'aluminum')
        for z in [1,15,30,45,59]:
            beam(prefix+'raker',(start,base-.25,z),(end,top-.25,z),.22 if grass else .55)
            for x,y in [(start+.25,base-.3),(end-.25,top-.3)]:
                beam(prefix+'support',(x,.15,z),(x,y,z),.15 if grass else .75)
                box(prefix+'footing',(x,.12,z),(.5 if grass else 1.5,.24,.7 if grass else 1.5),'concrete')
            if grass: beam(prefix+'cross brace',(start,.3,z),(end,top-.4,z),.12)
        if not grass:
            profile=[(start-.1,base-.2),(end,top-.2),(end,top-.85),(start-.1,base-.85)]
            mesh(prefix+'structural seating slab',[(x,y,z) for z in [0,60] for x,y in profile],
                 [(0,3,2,1),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,4,7,3),(1,2,6,5)],'concrete')
            box(prefix+'front fascia',(start-.12,base-.65,30),(.38,1.2,60),'trim')
            box(prefix+'shadow reveal',(start-.32,base-.27,30),(.06,.12,60),'steel')
            box(prefix+'rear concourse',(end+1.4,top-.4,30),(3.2,.6,60),'concrete')
            if deck:
                box(prefix+'suite glazing',(start+.3,base-2.25,30),(.18,1.65,58),'glass')
                for z in range(0,61,5): box(prefix+'suite mullion',(start+.16,base-2.25,z),(.28,1.85,.14),'aluminum')
                box(prefix+'suite sill',(start+.12,base-3.2,30),(.45,.25,60),'trim')
    if not grass:
        start,base,rows,tread,rise=spec['decks'][-1]; end=start+rows*tread; top=base+(rows-1)*rise
        roof_y=top+5
        roof_front=start-3 if premier else start+3
        roof_back=end+3
        box('Cantilever canopy',((roof_front+roof_back)/2,roof_y,30),(roof_back-roof_front,.38,60),'trim')
        box('Canopy leading edge',(roof_front,roof_y-.45,30),(.35,1.05,60),'steel')
        for z in [0,15,30,45,60]:
            beam('Canopy rear mast',(end+2,0,z),(end+2,roof_y+.6,z),.65)
            beam('Canopy upper chord',(roof_front,roof_y-.3,z),(roof_back,roof_y-.3,z),.22)
            beam('Canopy lower chord',(roof_front+1,roof_y-.7,z),(roof_back,roof_y-2.2,z),.22)
            for i in range(7):
                a=roof_front+(roof_back-roof_front)*i/7; b=roof_front+(roof_back-roof_front)*(i+1)/7
                beam('Canopy triangular web',(a,roof_y-.3,z),(b,roof_y-1.6,z),.12)
    near_parts=parts[:]
    for deck,(start,base,rows,tread,rise) in enumerate(spec['decks']):
        for z0,z1 in [(1,14),(16,29),(31,44),(46,59)]:
            ob=mesh('Distant seating rake',[(start,base+.4,z0),(start,base+.4,z1),
                (start+rows*tread,base+(rows-1)*rise+.4,z1),(start+rows*tread,base+(rows-1)*rise+.4,z0)],
                [(0,1,2,3)],'seats')
            ob.hide_render=True; ob.hide_viewport=True
            ob=mesh('Distant seated crowd',[(start,base+.43,z0),(start,base+.43,z1),
                (start+rows*tread,base+(rows-1)*rise+.43,z1),(start+rows*tread,base+(rows-1)*rise+.43,z0)],
                [(0,1,2,3)],'crowd',[(z0/48,0),(z1/48,0),(z1/48,rows),(z0/48,rows)])
            ob.hide_render=True; ob.hide_viewport=True
    distant_parts=[ob for ob in near_parts if not any(word in ob.name for word in
                   ['tread','bench','seat back','seated spectators','aisle step','guardrail','rail post','aisle handrail','aisle post','footing'])]+parts[len(near_parts):]
    def export_meshes(objects):
      groups={}
      for ob in objects:
        data=ob.data; data.calc_loop_triangles(); key=ob['component']
        g=groups.setdefault(key,{'position':[],'normal':[],'uv':[],'index':[],'_lookup':{}})
        for tri in data.loop_triangles:
            for li in tri.loops:
                co=data.vertices[data.loops[li].vertex_index].co; n=data.corner_normals[li].vector
                uv=data.uv_layers.active.data[li].uv if data.uv_layers.active else (0,0)
                values=tuple(round(float(v),5) for v in (co.x,co.z,-co.y,n.x,n.z,-n.y,*uv))
                if values not in g['_lookup']:
                    g['_lookup'][values]=len(g['position'])//3
                    g['position'].extend(values[:3]); g['normal'].extend(values[3:6]); g['uv'].extend(values[6:])
                g['index'].append(g['_lookup'][values])
      for g in groups.values(): del g['_lookup']
      return groups
    groups=export_meshes(near_parts)
    spec['deckCount']=len(spec['decks']); spec['height']=max(max(g['position'][1::3]) for g in groups.values())
    models[spec['id']]={**spec,'parts':groups,'distantParts':export_meshes(distant_parts)}
    # Separate editable source for each series, with daylight and an inspection view.
    for c in bpy.data.collections: c.hide_render=c!=collection; c.hide_viewport=c!=collection
    scene=bpy.context.scene
    scene.world=bpy.data.worlds.new(spec['id']+' daylight'); scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.6,.7,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    light_data=bpy.data.lights.new('Daylight','SUN'); light_data.energy=2
    light=bpy.data.objects.new('Daylight',light_data); collection.objects.link(light); light.rotation_euler=(.5,-.4,-.5)
    camera_data=bpy.data.cameras.new('Inspection'); camera=bpy.data.objects.new('Inspection',camera_data); collection.objects.link(camera); scene.camera=camera
    camera.location=point((-42 if not premier else -80,spec['height']*.7+8,-38 if not premier else -70))
    target=Vector(point((end/2 if not grass else 3,spec['height']*.48,30)))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler(); camera_data.lens=38
    scene.render.engine='CYCLES'; scene.cycles.samples=12; scene.cycles.use_denoising=True
    scene.render.resolution_x=1200; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'; scene.render.image_settings.file_format='PNG'
    render_path=OUT/(spec['id']+'-render.png')
    scene.render.filepath=str(render_path)
    bpy.context.preferences.filepaths.save_version=0
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D': area.spaces.active.region_3d.view_perspective='CAMERA'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(spec['id']+'-grandstand.blend')))
    bpy.ops.render.render(write_still=True)
    render_path.replace(OUT/(spec['id']+'-overview.png'))
    print('GRANDSTAND',spec['id'],spec['height'],sum(len(g['index'])//3 for g in groups.values()),flush=True)

payload={'version':1,'moduleLength':LENGTH,'materials':PALETTE,'models':models,
         'crowdTexture':'data:image/png;base64,'+base64.b64encode((OUT/'seated-crowd.png').read_bytes()).decode()}
(OUT/'grandstand-models.js').write_text('// Generated by tools/build_grandstands.py; original geometry and crowd artwork.\nconst SC_GRANDSTANDS = '+json.dumps(payload,separators=(',',':'))+';\n',encoding='utf8')

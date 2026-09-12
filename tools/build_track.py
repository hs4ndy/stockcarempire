"""Build an original Kansas-inspired straight speedway module in a separate Blender process.

Blender --background --python tools/build_track.py
Game coordinates: X across, Y up, +Z forward. No car/scene files are read or modified.
"""
import bpy
import bmesh
import json
import math
import subprocess
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'track'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
LENGTH = 60
parts = []

def point(p):
    return (p[0], -p[2], p[1])

def texture(name, pixels):
    h, w, _ = pixels.shape
    image = bpy.data.images.new(name, width=w, height=h, alpha=True)
    image.pixels.foreach_set(pixels.astype(np.float32).ravel())
    image.filepath_raw = str(OUT / (name + '.png'))
    image.file_format = 'PNG'
    image.save()
    return image

# Original seeded procedural textures; no photographs or logos are embedded.
rng = np.random.default_rng(2717)
h, w = 2048, 1024
y, x = np.mgrid[0:h, 0:w]
u, v = x / w, y / h
base = .365 + rng.normal(0, .020, (h, w))
# Clean aggregate and straight paving joints only. No wavy tire grooves,
# tar repairs or broad lane-shaped bands.
for seam in [.17, .39, .61, .83]:
    base -= .080 * np.exp(-((u - seam) / .0010) ** 2)
pixels = np.ones((h, w, 4))
pixels[:, :, :3] = np.clip(base[:, :, None] * np.array([1.025, 1.005, .975]), 0, 1)
asphalt = texture('speedway-asphalt', pixels)

h, w = 256, 1024
y, x = np.mgrid[0:h, 0:w]
base = .79 + rng.normal(0, .010, (h, w))
base -= .10 * np.exp(-((y / h - .12) / .15) ** 2)
for _ in range(45):
    cx, cy = rng.uniform(0, w), rng.uniform(.12, .64) * h
    base -= rng.uniform(.03, .18) * np.exp(-((x-cx)/rng.uniform(4, 65))**2 - ((y-cy)/rng.uniform(1, 4))**2)
pixels = np.ones((h, w, 4)); pixels[:, :, :3] = np.clip(base[:, :, None] * np.array([1.01, 1.01, 1]), 0, 1)
wall = texture('speedway-wall', pixels)

h = w = 256
y, x = np.mgrid[0:h, 0:w]
# Eight diamond cells across a .8-unit tile. Mipmaps and alpha-to-coverage
# soften the wire at distance without a giant transparent sorting surface.
distance = np.minimum(np.minimum((x+y) % 32, 32-(x+y) % 32),
                      np.minimum((x-y) % 32, 32-(x-y) % 32))
pixels = np.ones((h, w, 4)); pixels[:, :, :3] = [.28, .31, .32]
pixels[:, :, 3] = np.clip(2.0-distance, 0, 1)
fence = texture('speedway-mesh', pixels)
subprocess.run(['node', str(ROOT / 'tools' / 'pack_track_textures.cjs')], check=True)

M = {}
def material(key, color, image=None, alpha=False):
    mat = bpy.data.materials.new(key)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = .84
    if image:
        node = mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image = image
        node.extension = 'REPEAT'
        mat.node_tree.links.new(node.outputs['Color'], bs.inputs['Base Color'])
        if alpha:
            mat.node_tree.links.new(node.outputs['Alpha'], bs.inputs['Alpha'])
            mat.surface_render_method = 'DITHERED'
    M[key] = mat

material('asphalt', (.365, .36, .35), asphalt)
material('wall', (.8, .8, .79), wall)
material('concrete', (.48, .49, .48))
material('steel', (.22, .25, .26))
material('absorber', (.075, .08, .078))
material('paint', (.86, .85, .78))
material('fence', (.28, .31, .32), fence, True)

def mesh(name, verts, faces, mat, uvs=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata([point(p) for p in verts], [], faces); data.update()
    if uvs:
        uv = data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for li in poly.loop_indices:
                uv.data[li].uv = uvs[data.loops[li].vertex_index]
    bm = bmesh.new(); bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data); bm.free()
    ob = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(ob)
    data.materials.append(M[mat]); parts.append(ob)
    ob['component'] = mat
    return ob

def box(name, pos, size, mat):
    px, py, pz = pos; a, b, c = [s/2 for s in size]
    verts = [(px+dx, py+dy, pz+dz) for dx,dy,dz in
             [(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]]
    return mesh(name, verts, [(0,3,2,1),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,4,7,3),(1,2,6,5)], mat,
                [(p[2]/12, p[1]/1.3) for p in verts])

def beam(name, a, b, width, depth, mat):
    pa, pb = Vector(a), Vector(b)
    direction = (pb-pa).normalized()
    across = direction.cross(Vector((0, 0, 1))).normalized() * width/2
    along = Vector((0, 0, depth/2))
    verts = [tuple(p + s*across + t*along) for p in [pa,pb] for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    return mesh(name, verts, [(0,3,2,1),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,4,7,3),(1,2,6,5)],mat)

mesh('Continuous racing surface', [(-11.2,0,0),(11.2,0,0),(11.2,0,LENGTH),(-11.2,0,LENGTH)],
     [(0,3,2,1)], 'asphalt', [(0,0),(1,0),(1,1),(0,1)])

# Same collision-facing edge as the previous wall: +/-11.2. All support
# hardware is behind that plane. The track is flat and fully paved between walls.
profile = [(12.02,1.28),(12.02,4.30),(11.97,4.95),(11.78,5.55),(11.44,6.08),(10.99,6.48)]
for side in [-1,1]:
    label = 'Left' if side < 0 else 'Right'
    box(label+' concrete backing', (side*12.03,.67,30),(.74,1.34,60),'concrete')
    box(label+' barrier toe', (side*11.45,.035,30),(.50,.07,60),'concrete')
    box(label+' barrier cap', (side*11.93,1.35,30),(1.46,.10,60),'wall')
    for row in range(5):
        box(label+f' steel barrier rail {row+1}', (side*11.36,.154+row*.24,30),(.32,.232,60),'wall')
    for z in range(0,60,3):
        box(label+' energy absorber', (side*11.59,.63,z+1.5),(.14,1.03,.28),'absorber')
    # Narrow painted edge guide and an asphalt shoulder, no raised curbs.
    box(label+' white edge paint', (side*10.58,.006,30),(.14,.012,60),'paint')
    for z in range(0,60,6):
        zp = z+3
        box(label+' fence mounting plate', (side*12.02,1.42,zp),(.32,.06,.34),'steel')
        for j in range(len(profile)-1):
            a,b = profile[j],profile[j+1]
            beam(label+' curved fence post', (side*a[0],a[1],zp),(side*b[0],b[1],zp),.115,.115,'steel')
    dist = 0
    for j in range(len(profile)-1):
        a,b = profile[j],profile[j+1]
        length = math.dist(a,b)
        mesh(label+' woven catch mesh',[(side*a[0],a[1],0),(side*a[0],a[1],60),(side*b[0],b[1],60),(side*b[0],b[1],0)],
             [(0,1,2,3)],'fence',[(0,dist/.8),(75,dist/.8),(75,(dist+length)/.8),(0,(dist+length)/.8)])
        dist += length
    for px,py in profile[1:] + [(12.02,2.25),(12.02,3.3)]:
        box(label+' longitudinal tension cable',(side*px,py,30),(.028,.028,60),'steel')

# A single finish assembly, exported in finish-local coordinates (Z=0).
# The Blender study displays it at the middle of the 60-unit module; runtime
# places it once at the existing 15,000-unit classification plane.
module_parts = parts[:]
for side in [-1, 1]:
    px = side * 13.1
    box('Finish concrete footing', (px,.15,0),(1,.3,1.6),'concrete')
    for z in [-.45,.45]:
        box('Finish steel upright', (px,4.55,z),(.22,8.5,.22),'steel')
    for height in [2.4,4.8,7.8,8.8]:
        box('Finish upright tie', (px,height,0),(.22,.12,1.12),'steel')
for z in [-.45,.45]:
    for height in [7.8,8.8]:
        box('Finish truss chord', (0,height,z),(26.42,.14,.14),'steel')
    for i in range(12):
        a = -13.1 + i * 26.2 / 12
        b = -13.1 + (i+1) * 26.2 / 12
        beam('Finish diagonal web', (a,7.8 if i%2==0 else 8.8,z),
             (b,8.8 if i%2==0 else 7.8,z),.08,.08,'steel')
for px in [-13.1,-6.55,0,6.55,13.1]:
    box('Finish truss cross tie', (px,8.8,0),(.12,.12,1.04),'steel')
box('Finish sign housing', (0,8.3,0),(6.8,1.18,1.12),'absorber')
for height in [7.73,8.87]:
    box('Finish sign white trim', (0,height,0),(6.8,.04,1.15),'paint')
for facing in [-1,1]:
    # Real mesh lettering on both faces, readable from the chase and mirror.
    bpy.ops.object.text_add(location=point((0,8.3,facing*.57)),
                            rotation=(math.pi/2,0,math.pi if facing<0 else 0))
    ob=bpy.context.object; ob.name='Finish lettering'
    ob.data.body='FINISH'; ob.data.align_x='CENTER'; ob.data.align_y='CENTER'
    ob.data.size=.82; ob.data.space_character=1.15; ob.data.resolution_u=2
    bpy.ops.object.convert(target='MESH')
    ob=bpy.context.object
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    ob.data.materials.append(M['paint']); ob['component']='paint'; parts.append(ob)
    for col in range(3):
        for row in range(2):
            for side in [-1,1]:
                if (row+col)%2==0:
                    box('Finish sign checks',(side*(2.25+col*.22),8.08+row*.22,facing*.572),
                        (.22,.22,.012),'paint')
# Flush painted squares, not raised blocks. The stripe straddles Z=0 exactly.
for row in range(2):
    for col in range(22):
        left=-11+col; near=-1+row
        mesh('Finish painted square',[(left,.014,near),(left+1,.014,near),
             (left+1,.014,near+1),(left,.014,near+1)],[(0,3,2,1)],
             'paint' if (row+col)%2==0 else 'absorber')
for z in [-1.08,1.08]:
    mesh('Finish paint border',[(-11,.014,z-.06),(11,.014,z-.06),
         (11,.014,z+.06),(-11,.014,z+.06)],[(0,3,2,1)],'paint')
finish_parts=parts[len(module_parts):]

# Export evaluated Blender mesh data, including UVs. Runtime shares one indexed
# buffer per material over the full straight instead of loading a GLB at race start.
groups = {}
finish_groups = {}
for ob in parts:
    data = ob.data; data.calc_loop_triangles()
    key = ob['component']
    target_groups = groups if ob in module_parts else finish_groups
    g = target_groups.setdefault(key, {'position':[], 'normal':[], 'uv':[], 'index':[]})
    lookup = g.setdefault('_lookup',{})
    for tri in data.loop_triangles:
        for li in tri.loops:
            co = data.vertices[data.loops[li].vertex_index].co
            n = data.corner_normals[li].vector
            uv = data.uv_layers.active.data[li].uv if data.uv_layers.active else (0,0)
            values = tuple(round(float(v),6) for v in (co.x,co.z,-co.y,n.x,n.z,-n.y,*uv))
            if values not in lookup:
                lookup[values] = len(g['position'])//3
                g['position'].extend(values[:3]); g['normal'].extend(values[3:6]); g['uv'].extend(values[6:])
            g['index'].append(lookup[values])
for g in [*groups.values(), *finish_groups.values()]:
    del g['_lookup']
payload = {'version':2,'name':'Empire Kansas-inspired straight','moduleLength':60,'trackWidth':22,
           'wallInnerX':11.2,'fenceHeight':6.48,'parts':groups,'finishParts':finish_groups}
(OUT/'track-model.js').write_text('// Generated by tools/build_track.py; original Kansas-inspired geometry.\nconst SC_TRACK_MODEL = '+json.dumps(payload,separators=(',',':'))+';\n',encoding='utf8')

for ob in finish_parts: ob.location=point((0,0,30))
for ob in parts: ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'empire-straight.glb'),use_selection=True,export_format='GLB')
for image in [asphalt,wall,fence]: image.pack()

scene = bpy.context.scene
scene.world = bpy.data.worlds.new('Track daylight'); scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.48,.59,.69,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
sun_data=bpy.data.lights.new('Daylight','SUN'); sun_data.energy=2.1; sun_data.angle=.12
sun=bpy.data.objects.new('Daylight',sun_data); scene.collection.objects.link(sun)
sun.rotation_euler=(.45,-.35,-.4)
camera_data=bpy.data.cameras.new('Track inspection'); camera=bpy.data.objects.new('Track inspection',camera_data)
scene.collection.objects.link(camera); scene.camera=camera
camera.location=point((24,20,-19)); target=Vector(point((0,1.5,23)))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.lens=36
scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.resolution_x=1440; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(OUT/'track-overview.png')
scene.view_settings.view_transform='AgX'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
for ob in parts: ob.select_set(False)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'empire-straight.blend'))
bpy.ops.render.render(write_still=True)
camera.location=point((5,3,-6)); target=Vector(point((9,2.2,19)))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(OUT/'track-detail.png')
bpy.ops.render.render(write_still=True)
print('TRACK_EXPORT',json.dumps({'trianglesPerModule':sum(len(g['index'])//3 for g in groups.values()),'materials':list(groups)}))

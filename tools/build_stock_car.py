"""Build the original Empire SC-01 stock car and its shared browser geometry.

Run with Blender --background --python tools/build_stock_car.py.
Coordinates in modeling helpers match the game: X across, Y up, +Z forward.
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'cars'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def point(p):
    return (p[0], -p[2], p[1])

def material(name, color, metallic=0, roughness=.38):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = roughness
    return m

M = {
    'paint': material('paint', (.48, .008, .016), .3, .32),
    'accent': material('accent', (.89, .91, .85), .12),
    'trim': material('trim', (.014, .018, .021), .05, .5),
    'glass': material('glass', (.035, .075, .10), .42, .17),
    'metal': material('metal', (.26, .31, .34), .75, .3),
    'headlight': material('headlight', (.82, .88, .83), .1),
    'taillight': material('taillight', (.48, .008, .012), .2),
    'rubber': material('rubber', (.018, .021, .025), 0, .8),
}
parts = []

def mesh(name, verts, faces, mat, smooth=False, export=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata([point(v) for v in verts], [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data)
    bm.free()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(M[mat])
    for face in data.polygons:
        face.use_smooth = smooth
    if export:
        parts.append(ob)
    return ob

def box(name, pos, size, mat, bevel=0, export=True):
    x,y,z = pos
    a,b,c = [v/2 for v in size]
    ob = mesh(name, [(x+dx,y+dy,z+dz) for dx,dy,dz in
        [(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]],
        [(0,3,2,1),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,4,7,3),(1,2,6,5)],mat,export=export)
    if bevel:
        mod=ob.modifiers.new('Soft stamped edge','BEVEL')
        mod.width=bevel
        mod.segments=2
    return ob

def tube(name, a, b, radius, mat, segments=8):
    pa,pb=Vector(a),Vector(b)
    direction=(pb-pa).normalized()
    u=direction.cross(Vector((0,1,0)))
    if u.length < .01:
        u=direction.cross(Vector((1,0,0)))
    u.normalize()
    v=direction.cross(u).normalized()
    verts=[tuple(p+radius*(u*math.cos(t*math.tau/segments)+v*math.sin(t*math.tau/segments)))
           for p in [pa,pb] for t in range(segments)]
    faces=[(i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments)]
    faces += [tuple(range(segments-1,-1,-1)),tuple(range(segments,2*segments))]
    return mesh(name,verts,faces,mat,True)

def interp(z, knots):
    for (a,va),(b,vb) in zip(knots,knots[1:]):
        if z <= b:
            t=max(0,min(1,(z-a)/(b-a)))
            return va+(vb-va)*t
    return knots[-1][1]

def arch_bottom(z):
    h=.19
    for axle in [-1.42,1.42]:
        d=abs(z-axle)
        if d < .46:
            h=max(h,.40+math.sqrt(.46**2-d**2))
    return h

def body_height(z):
    return max(interp(z,[(-2.48,.76),(-2.0,.86),(-.9,.89),(.75,.87),(1.7,.80),(2.48,.65)]),arch_bottom(z)+.05)

# Continuous stamped shell with open wheel wells, rounded shoulders and a hood.
zs=sorted(set([-2.48,-2.4,-2.25,-2.04,-.90,-.75,-.4,0,.4,.75,.90,2.04,2.25,2.4,2.48]+
    [round(axle+.46*math.cos(i*math.pi/14),6) for axle in [-1.42,1.42] for i in range(15)]))
verts=[]
for z in zs:
    w=interp(z,[(-2.48,.91),(-2.25,1.05),(-1.42,1.075),(0,1.02),(1.42,1.075),(2.25,1.03),(2.48,.90)])
    h=body_height(z)
    verts += [(x,y,z) for x,y in [(-w,arch_bottom(z)),(-w,h-.035),(-w*.94,h+.005),
        (-w*.78,h+.03),(0,h+.047),(w*.78,h+.03),(w*.94,h+.005),(w,h-.035),(w,arch_bottom(z))]]
faces=[]
for j in range(len(zs)-1):
    for k in range(8):
        a=j*9+k
        faces.append((a,a+1,a+10,a+9))
faces += [tuple(range(8,-1,-1)),tuple((len(zs)-1)*9+i for i in range(9))]
mesh('SC01 sculpted body and open wheel arches',verts,faces,'paint',True)
box('Undertray',(0,.15,0),(1.86,.065,4.60),'trim',.03)

# Cabin: low coupe roof and raked front/rear glazing, framed by painted pillars.
roof=box('Crowned roof',(0,1.285,-.22),(1.52,.075,1.36),'paint',.055)
mesh('Front windshield',[(-.74,1.30,.43),(.74,1.30,.43),(.87,.92,.99),(-.87,.92,.99)],[(0,1,2,3)],'glass')
mesh('Rear windshield',[(-.74,1.29,-.85),(-.89,.91,-1.50),(.89,.91,-1.50),(.74,1.29,-.85)],[(0,1,2,3)],'glass')
for side in [-1,1]:
    mesh('Side glazing',[(side*.755,1.28,.41),(side*.755,1.28,-.83),
         (side*.94,.915,-1.30),(side*.94,.915,.85)],[(0,1,2,3)],'glass')
    tube('A pillar',(side*.765,1.29,.43),(side*.91,.90,.98),.047,'paint')
    tube('C pillar',(side*.77,1.28,-.88),(side*.95,.91,-1.50),.07,'paint')
    tube('Window sill',(side*.943,.91,-1.31),(side*.943,.91,.89),.028,'trim')
    tube('B pillar',(side*.773,1.28,-.30),(side*.943,.917,-.36),.030,'trim')
    tube('Roof rail',(side*.77,1.30,-.83),(side*.77,1.30,.43),.022,'paint')
    box('Side skirt',(side*1.035,.19,0),(.07,.095,1.95),'trim',.018)
    box('Lower door sweep',(side*1.042,.29,-.05),(.016,.055,1.69),'accent')
    # Wheel-arch lips follow the actual tire cutouts.
    for axle in [-1.42,1.42]:
        for i in range(14):
            a=i*math.pi/14
            b=(i+1)*math.pi/14
            tube('Fender rolled lip',(side*1.078,.40+.465*math.sin(a),axle+.465*math.cos(a)),
                 (side*1.078,.40+.465*math.sin(b),axle+.465*math.cos(b)),.013,'paint',6)
    # Small roof-height door mirror with a dark face.
    tube('Mirror stem',(side*.90,1.00,.72),(side*1.09,1.015,.65),.025,'trim')
    box('Mirror shell',(side*1.09,1.03,.64),(.16,.09,.19),'paint',.025)
    box('Mirror face',(side*1.09,1.03,.54),(.12,.06,.009),'metal')
    tube('Side exhaust',(side*1.04,.23,-.73),(side*1.08,.23,-.73),.050,'metal',12)

# Splitter, grille and low-profile deck spoiler instead of a pedestal wing.
box('Front splitter',(0,.13,2.32),(2.21,.055,.42),'trim',.035)
box('Front grille',(0,.40,2.485),(1.16,.235,.021),'trim',.035)
for y in [.33,.39,.45]:
    box('Grille slat',(0,y,2.501),(1.08,.013,.013),'metal')
for side in [-1,1]:
    box('Headlight housing',(side*.70,.562,2.49),(.37,.14,.018),'trim',.015)
    mesh('Headlight graphic',[(side*.53,.61,2.504),(side*.86,.60,2.504),
        (side*.84,.535,2.504),(side*.54,.55,2.504)],[(0,1,2,3)],'headlight')
    box('Brake inlet',(side*.77,.30,2.466),(.23,.12,.025),'trim',.018)
    box('Tail lamp recess',(side*.64,.60,-2.485),(.50,.14,.015),'trim',.012)
    for i in range(3):
        box('Tail lamp',(side*(.45+i*.17),.60,-2.498),(.12,.065,.012),'taillight',.008)
box('Rear diffuser',(0,.24,-2.40),(1.55,.12,.22),'trim',.01)
for x in [-.70,-.35,0,.35,.70]:
    box('Diffuser fin',(x,.17,-2.38),(.022,.17,.30),'trim')
spoiler=mesh('Deck-mounted blade spoiler',[(-1.01,.85,-2.25),(1.01,.85,-2.25),
    (1.01,1.03,-2.36),(-1.01,1.03,-2.36),(-1.01,.85,-2.23),(1.01,.85,-2.23),
    (1.01,1.03,-2.34),(-1.01,1.03,-2.34)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],'trim')
box('Rear bumper accent',(0,.72,-2.49),(1.8,.035,.015),'accent')

# Flat livery panels and hood vents. These tint independently in the game.
for side in [-1,1]:
    stripe_zs=sorted(set([.99,2.40]+[z for z in zs if .99<z<2.40]))
    stripe_verts=[]
    for z in stripe_zs:
        for x in [.11,.27]:
            stripe_verts.append((side*x,body_height(z)+.049-x*.021,z))
    mesh('Hood racing stripe',stripe_verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(stripe_zs)-1)],'accent')
    for z in [1.10,1.20,1.30,1.40]:
        y=body_height(z)+.041
        box('Hood cooling louver',(side*.53,y,z),(.24,.015,.035),'trim',.005)
    mesh('Rear quarter livery sweep',[(side*1.077,.84,-1.96),(side*1.077,.69,-1.99),
        (side*1.03,.47,-.66),(side*1.03,.63,-.68)],[(0,1,2,3)],'accent')
for z in [-.66,-.16]:
    box('Roof flap seam',(0,1.325,z),(.88,.004,.009),'trim')
for x in [-.44,.44]:
    box('Roof flap seam',(x,1.325,-.41),(.009,.004,.50),'trim')

# Driver's window net, two windshield braces and rear glass retention strips.
for z in [-.20,-.05,.10,.25,.40]:
    tube('Window safety net',(-.805,1.18,z),(-.941,.95,z),.008,'trim',4)
for y in [.99,1.05,1.11,1.17]:
    x=-.941+(y-.95)/.23*.136
    tube('Window safety net',(x,y,-.20),(x,y,.40),.008,'trim',4)
for x in [-.27,.27]:
    tube('Windshield brace',(x,1.303,.44),(x,.925,.985),.011,'metal',6)
    tube('Rear window strap',(x,1.295,-.85),(x,.921,-1.49),.013,'metal',6)

# One local wheel prototype. All four instances share this baked geometry.
wheel_parts=[]
def wheel_mesh(name, verts, faces, mat, smooth=True):
    ob=mesh(name,verts,faces,mat,smooth)
    parts.remove(ob)
    wheel_parts.append(ob)
    return ob

verts=[]
rings=[(-.165,.31),(-.155,.366),(-.115,.40),(.115,.40),(.155,.366),(.165,.31)]
n=32
for x,r in rings:
    verts += [(x,r*math.sin(i*math.tau/n),r*math.cos(i*math.tau/n)) for i in range(n)]
faces=[]
for j in range(len(rings)-1):
    faces += [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for i in range(n)]
wheel_mesh('Slick tire',verts,faces,'rubber')
for side in [-1,1]:
    # Rim rings and ten visible forged spokes.
    vs=[]
    for x,r in [(side*.166,.305),(side*.170,.284),(side*.151,.263)]:
        vs += [(x,r*math.sin(i*math.tau/n),r*math.cos(i*math.tau/n)) for i in range(n)]
    fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(2) for i in range(n)]
    wheel_mesh('Forged wheel lip',vs,fs,'metal')
    vs=[]; fs=[]
    for i in range(10):
        a=i*math.tau/10
        p=len(vs)
        vs += [(side*.169,r*math.sin(a+da),r*math.cos(a+da)) for r,da in [(.075,-.14),(.285,-.065),(.285,.065),(.075,.14)]]
        fs.append((p,p+1,p+2,p+3))
    wheel_mesh('Ten forged spokes',vs,fs,'metal',False)
    vs=[(side*.173,0,0)]+[(side*.173,.075*math.sin(i*math.tau/8),.075*math.cos(i*math.tau/8)) for i in range(8)]
    wheel_mesh('Center lock',vs,[(0,1+i,1+(i+1)%8) for i in range(8)],'accent',False)

# Bake exactly the same meshes for Blender, GLB and the synchronous Three r134 adapter.
def bake(objects, vertex_colors=False):
    groups={}
    deps=bpy.context.evaluated_depsgraph_get()
    for ob in objects:
        ev=ob.evaluated_get(deps)
        data=ev.to_mesh()
        data.calc_loop_triangles()
        key='wheel' if vertex_colors else ob.data.materials[0].name
        group=groups.setdefault(key,{'position':[],'normal':[], **({'color':[]} if vertex_colors else {})})
        for tri in data.loop_triangles:
            for li in tri.loops:
                loop=data.loops[li]
                co=ev.matrix_world @ data.vertices[loop.vertex_index].co
                normal=data.corner_normals[li].vector
                group['position'] += [round(co.x,5),round(co.z,5),round(-co.y,5)]
                group['normal'] += [round(normal.x,5),round(normal.z,5),round(-normal.y,5)]
                if vertex_colors:
                    group['color'] += list(ob.data.materials[0].diffuse_color[:3])
        ev.to_mesh_clear()
    # Share identical position/normal/color tuples to reduce download and GPU memory.
    for group in groups.values():
        indexed={name:[] for name in group}
        lookup={}; indices=[]
        for i in range(0,len(group['position']),3):
            key=tuple(v for values in group.values() for v in values[i:i+3])
            if key not in lookup:
                lookup[key]=len(lookup)
                for name,values in group.items(): indexed[name] += values[i:i+3]
            indices.append(lookup[key])
        group.clear(); group.update(indexed); group['index']=indices
    return groups

payload={'version':1,'name':'Empire SC-01','wheelRadius':.40,
         'wheelPositions':[[-1.00,.40,-1.42],[1.00,.40,-1.42],[-1.00,.40,1.42],[1.00,.40,1.42]],
         'parts':bake(parts),'wheel':bake(wheel_parts,True)['wheel']}
(OUT/'stock-car-model.js').write_text('// Generated by tools/build_stock_car.py. Original Empire SC-01 geometry.\nconst SC_STOCK_CAR_MODEL = '+json.dumps(payload,separators=(',',':'))+';\n',encoding='utf8')

for ob in wheel_parts:
    for i,(x,y,z) in enumerate(payload['wheelPositions']):
        copy=ob.copy()
        copy.data=ob.data
        copy.name=f'Wheel {i+1} - {ob.name}'
        copy.location=point((x,y,z))
        bpy.context.collection.objects.link(copy)
    bpy.data.objects.remove(ob,do_unlink=True)

# Display numbers are original editable curves, excluded from shared game geometry.
display_font=bpy.data.fonts.load('C:/Windows/Fonts/arialbi.ttf')
def lettering(name, text, pos, size, rotation):
    curve=bpy.data.curves.new(name,'FONT')
    curve.body=text
    curve.align_x='CENTER'; curve.align_y='CENTER'
    curve.size=size; curve.shear=.16
    curve.font=display_font
    curve.extrude=.0005
    ob=bpy.data.objects.new(name,curve)
    bpy.context.collection.objects.link(ob)
    ob.location=point(pos); ob.rotation_euler=rotation
    curve.materials.append(M['accent'])
    return ob

lettering('Roof race number','27',(0,1.331,-.20),.83,(0,0,0))
lettering('Left door race number','27',(-1.043,.60,.04),.50,(math.pi/2,0,-math.pi/2))
lettering('Right door race number','27',(1.043,.60,.04),.50,(math.pi/2,0,math.pi/2))
lettering('Rear deck wordmark','EMPIRE',(0,.908,-1.91),.19,(0,0,math.pi))
model_objects=list(bpy.context.scene.objects)
for ob in model_objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'empire-sc01.glb'),use_selection=True,export_format='GLB')

# Neutral studio with three livery studies. Studio is excluded from the GLB.
for title,offset,color in [('Cobalt',(3.4,1.2,0),(.018,.16,.62)),('Ivory',(-3.4,1.2,0),(.79,.80,.72))]:
    paint=material(title+' paint',color,.3,.28)
    accent=material(title+' accent',(.10,.12,.14) if title=='Ivory' else (.82,.91,.11),.12)
    for ob in model_objects:
        copy=ob.copy()
        copy.data=ob.data.copy()
        copy.name=title+' / '+ob.name
        copy.location += Vector(offset)
        for i,m in enumerate(copy.data.materials):
            if m==M['paint']: copy.data.materials[i]=paint
            elif m==M['accent']: copy.data.materials[i]=accent
        bpy.context.collection.objects.link(copy)

floor_mat=material('Studio graphite',(.07,.085,.10),.1,.55)
M['floor']=floor_mat
box('Studio floor',(0,-.065,0),(200,.10,200),'floor',export=False)
scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Studio world')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.25,.30,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
    ob=bpy.data.objects.new(name,data); scene.collection.objects.link(ob); ob.location=loc
    ob.rotation_euler=(Vector((0,0,.4))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Large softbox',(-4,-5,8),1800,7)
area('Front fill',(5,-3,5),1250,5)
area('Rim light',(0,6,7),2400,6)
cam_data=bpy.data.cameras.new('Presentation camera')
cam=bpy.data.objects.new('Presentation camera',cam_data)
scene.collection.objects.link(cam)
cam.location=(10,-13,9)
cam.rotation_euler=(Vector((0,.2,.55))-cam.location).to_track_quat('-Z','Y').to_euler()
cam_data.type='ORTHO'; cam_data.ortho_scale=13.6
scene.camera=cam
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1600; scene.render.resolution_y=1050; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'sc01-lineup.png')
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.65
for screen in bpy.data.screens:
    for area_ui in screen.areas:
        if area_ui.type=='VIEW_3D':
            area_ui.spaces.active.region_3d.view_perspective='CAMERA'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'empire-sc01.blend'))
bpy.ops.render.render(write_still=True)
print('SC01_EXPORT',json.dumps({'bodyTriangles':sum(len(p['index'])//3 for p in payload['parts'].values()),'wheelTriangles':len(payload['wheel']['index'])//3,'materials':list(payload['parts'])}))

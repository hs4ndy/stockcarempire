"""Blender 5.x: author six original trophies and export game-ready indexed meshes.
Run: blender --background --python tools/build_trophies.py
Never opens or overwrites any car source file. Z-up Blender -> Y-up Three.js.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'trophies'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
COLORS = {'gold':'d9ad52','silver':'cbd3dc','dark':'20252c','wood':'38251d','blue':'286397'}
materials = {}
for key, value in COLORS.items():
    m = bpy.data.materials.new(key); m.diffuse_color = tuple(int(value[i:i+2],16)/255 for i in (0,2,4))+(1,)
    m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=m.diffuse_color
    p.inputs['Metallic'].default_value=.8 if key in ('gold','silver') else .1
    p.inputs['Roughness'].default_value=.26 if key in ('gold','silver') else .45
    materials[key]=m

collection=None
def attach(obj, name, mat):
    obj.name=name
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj); obj.data.materials.append(materials[mat])
    return obj

def mesh(name, verts, faces, mat, smooth=True):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);collection.objects.link(obj);data.materials.append(materials[mat])
    for p in data.polygons:p.use_smooth=smooth
    return obj

def lathe(name, profile, mat, x=0, y=0, z=0, scale=1):
    n=48;verts=[];faces=[]
    for r,h in profile:
        for i in range(n):
            a=i*math.tau/n;verts.append((x+scale*r*math.cos(a),y+scale*r*math.sin(a),z+scale*h))
    for j in range(len(profile)-1):
        for i in range(n):
            k=j*n+i;q=j*n+(i+1)%n;faces.append((k,q,q+n,k+n))
    return mesh(name,verts,faces,mat)

def box(name, xyz, size, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz);o=attach(bpy.context.object,name,mat);o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Soft machined edges','BEVEL');mod.width=bevel;mod.segments=2
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def tube(name, points, radius, mat, closed=False):
    verts=[];faces=[];n=8
    for i,p in enumerate(points):
        p=Vector(p);prev=Vector(points[(i-1)%len(points)] if closed or i else points[i]);nxt=Vector(points[(i+1)%len(points)] if closed or i<len(points)-1 else points[i]);t=(nxt-prev).normalized()
        u=t.cross(Vector((0,0,1)))
        if u.length<.01:u=t.cross(Vector((0,1,0)))
        u.normalize();v=t.cross(u).normalized()
        for j in range(n):
            a=j*math.tau/n;verts.append(tuple(p+radius*(u*math.cos(a)+v*math.sin(a))))
    for i in range(len(points) if closed else len(points)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,((i+1)%len(points))*n+(j+1)%n,((i+1)%len(points))*n+j))
    return mesh(name,verts,faces,mat)

def ring(name,r,z,mat='gold',tube_r=.035,x=0,y=0):
    return tube(name,[(x+r*math.cos(a*math.tau/64),y+r*math.sin(a*math.tau/64),z) for a in range(64)],tube_r,mat,True)

def base(radius=.68,mat='dark'):
    lathe('Stepped plinth',[(0,0),(radius,0),(radius,.12),(radius*.92,.16),(radius*.92,.28),(0,.28)],mat)
    ring('Base inlay',radius*.94,.17,'gold',.018)
    box('Award plaque',(0,-radius*.93,.21),(radius*.86,.028,.12),'gold',.008)

def cup(x=0,y=0,z=.26,s=1,mat='gold',handles=True):
    lathe('Cup foot and stem',[(0,0),(.37,0),(.37,.07),(.29,.12),(.14,.18),(.10,.5),(.19,.59)],mat,x,y,z,s)
    lathe('Open cup bowl',[(.15,.54),(.32,.65),(.48,.85),(.57,1.08),(.59,1.27),(.55,1.27),(.53,1.08),(.44,.86),(.28,.68),(0,.64)],mat,x,y,z,s)
    ring('Rolled lip',.57*s,z+1.27*s,mat,.035*s,x,y)
    if handles:
        for side in (-1,1):
            pts=[]
            for i in range(33):
                a=math.pi*i/32
                pts.append((x+side*s*(.48+.39*math.sin(a)),y,z+s*(.91+.30*math.cos(a))))
            tube('Swept cup handle',pts,.045*s,mat)

def flag(name,side,z,height,width,mat):
    # Solid, gently swept checkered ribbon, not a flat flag decal.
    rows=12;cols=6;verts=[];faces=[]
    for layer in (-.018,.018):
        for j in range(rows+1):
            t=j/rows
            for i in range(cols+1):
                u=i/cols;x=side*(.10+.42*t+u*width*(.35+.65*t))
                y=.12*math.sin(t*math.pi*1.5+u*2)+layer
                verts.append((x,y,z+t*height+.16*math.sin(u*math.pi)*t))
    N=(rows+1)*(cols+1)
    for j in range(rows):
        for i in range(cols):
            a=j*(cols+1)+i;faces.extend([(a,a+1,a+cols+2,a+cols+1),(N+a+cols+1,N+a+cols+2,N+a+1,N+a)])
    o=mesh(name,verts,faces,mat);o.data.materials.append(materials['dark'])
    for j in range(rows):
        for i in range(cols):
            if (i+j)%2==0:
                o.data.polygons[(j*cols+i)*2].material_index=1;o.data.polygons[(j*cols+i)*2+1].material_index=1
    return o

def build(key):
    global collection
    collection=bpy.data.collections.new(key);bpy.context.scene.collection.children.link(collection)
    if key=='grassroots-win':
        base(.65,'wood');cup()
    elif key=='grassroots-championship':
        box('Walnut championship base',(0,0,.18),(2.5,1.0,.36),'wood')
        box('Gold plinth trim',(0,0,.39),(2.55,1.04,.07),'gold')
        box('Championship plaque',(0,-.52,.19),(.9,.035,.21),'gold')
        cup(z=.43,s=1.3)
        cup(-.91,0,.43,.66);cup(.91,0,.43,.66)
    elif key=='challenger-win':
        base(.7);lathe('Tapered pedestal',[(0,.27),(.4,.27),(.28,.65),(.22,.9),(0,.9)],'silver')
        cup(z=.84,s=1.08,mat='silver')
        ring('Blue racing collar',.285,.67,'blue',.045)
        for side in (-1,1):tube('Rising gold flourish',[(side*(.43+.3*math.sin(t*math.pi)),.18,.32+1.35*t) for t in [i/24 for i in range(25)]],.035,'gold')
    elif key=='challenger-championship':
        base(.85);lathe('Silver tapered tower',[(0,.28),(.57,.28),(.50,.60),(.34,1.12),(.21,1.72),(0,1.72)],'silver')
        ring('Lower award ring',.53,.52,'silver',.04)
        flag('Left checkered sweep',-1,1.15,1.65,.54,'silver')
        flag('Right checkered sweep',1,1.15,1.65,.54,'silver')
        tube('Central silver spine',[(0,0,.65),(0,0,1.8),(0,0,2.92)],.055,'silver')
        box('Blue award inset',(0,-.405,.85),(.38,.035,.19),'blue',.01)
    elif key=='premier-win':
        base(.8);lathe('Tall fluted stem',[(0,.27),(.45,.27),(.34,.42),(.20,.75),(.17,1.04),(.30,1.18)],'gold')
        cup(z=1.02,s=1.10,mat='silver',handles=False)
        for side in (-1,1):
            tube('Victory arch',[(side*(.38+.52*math.sin(t*math.pi)),0,.45+1.7*t) for t in [i/36 for i in range(37)]],.065,'gold')
        ring('Victory crown',.64,2.42,'gold',.05)
    else:
        base(.9)
        lathe('Broad silver championship chalice',[(0,.28),(.55,.28),(.53,.46),(.35,.75),(.30,1.03),(.4,1.4),(.61,1.9),(.84,2.45),(1.02,2.9),(1.02,3.03),(.96,3.03),(.95,2.9),(.77,2.45),(.55,1.92),(.32,1.42),(0,1.3)],'silver')
        ring('Wide polished rim',.99,3.03,'silver',.055)
        # Abstract flowing loops replace copyrighted/track-specific silhouettes.
        for j in range(7):
            pts=[]
            for i in range(96):
                a=math.tau*i/96;z=1.15+j*.255+.075*math.sin(3*a+j*.65)
                r=.35+(z-1.15)*.365+.07
                pts.append((r*math.cos(a),r*math.sin(a),z))
            tube('Encircling championship loop %d'%j,pts,.035,'silver',True)
        ring('Gold champion collar',.48,.59,'gold',.045)
    return collection

bank={}
for key in ['grassroots-win','grassroots-championship','challenger-win','challenger-championship','premier-win','premier-championship']:
    c=build(key);parts={};bpy.context.view_layer.update()
    for o in c.objects:
        data=o.data;data.calc_loop_triangles()
        for tri in data.loop_triangles:
            mat=data.materials[tri.material_index].name;part=parts.setdefault(mat,{'positions':[],'normals':[]})
            poly=data.polygons[tri.polygon_index]
            for vi in tri.vertices:
                p=o.matrix_world @ data.vertices[vi].co
                n=data.vertices[vi].normal if poly.use_smooth else poly.normal
                part['positions'].extend(round(v,5) for v in (p.x,p.z,-p.y))
                part['normals'].extend(round(v,5) for v in (n.x,n.z,-n.y))
    compact=[]
    for mat,p in parts.items():
        pos=[];norm=[];indices=[];seen={}
        for i in range(0,len(p['positions']),3):
            vertex=tuple(p['positions'][i:i+3]+p['normals'][i:i+3])
            if vertex not in seen:
                seen[vertex]=len(pos)//3;pos.extend(vertex[:3]);norm.extend(vertex[3:])
            indices.append(seen[vertex])
        compact.append({'material':mat,'positions':pos,'normals':norm,'indices':indices})
    bank[key]={'parts':compact}
    print(key, sum(len(p['positions'])//9 for p in parts.values()),'triangles')
# Arrange the editable Blender collection as a lineup after exporting local meshes.
for i,c in enumerate([bpy.data.collections[k] for k in bank]):
    for o in c.objects:o.location.x+=(i-2.5)*3.3
bpy.context.scene.world=bpy.data.worlds.new('Trophy studio');bpy.context.scene.world.color=(.12,.12,.12)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'empire-trophies.blend'))
(OUT/'trophy-models.js').write_text('// Generated by tools/build_trophies.py; original Stock Car Empire geometry.\nconst SC_TROPHY_MODELS = '+json.dumps(bank,separators=(',',':'))+';\n',encoding='utf-8')

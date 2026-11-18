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
COLORS = {'gold':'d9ad52','silver':'cbd3dc','dark':'20252c','wood':'38251d','blue':'286397','graphite':'414448'}
materials = {}
for key, value in COLORS.items():
    m = bpy.data.materials.new(key); m.diffuse_color = tuple(int(value[i:i+2],16)/255 for i in (0,2,4))+(1,)
    m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=m.diffuse_color
    p.inputs['Metallic'].default_value=.8 if key in ('gold','silver','graphite') else .1
    p.inputs['Roughness'].default_value=.26 if key in ('gold','silver','graphite') else .45
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

def tube(name, points, radius, mat, closed=False, caps=False):
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
    if caps:
        faces.extend([tuple(reversed(range(n))), tuple(range(len(verts)-n,len(verts)))])
    return mesh(name,verts,faces,mat)

def ring(name,r,z,mat='gold',tube_r=.035,x=0,y=0):
    return tube(name,[(x+r*math.cos(a*math.tau/64),y+r*math.sin(a*math.tau/64),z) for a in range(64)],tube_r,mat,True)

def turning(name, profile, finish, x=0, z=0, scale=1, segments=48):
    """Spin a closed section. Each optional finish colors the band below its point."""
    verts, faces, bands = [], [], []
    previous = []
    for point in profile:
        radius, height = point[:2]
        count = segments if radius else 1
        current = []
        for i in range(count):
            angle = math.tau * i / segments
            current.append(len(verts))
            verts.append((x + scale * radius * math.cos(angle),
                          scale * radius * math.sin(angle), z + scale * height))
        if previous:
            material = point[2] if len(point) > 2 else finish
            for i in range(segments):
                j = (i + 1) % segments
                if len(previous) == 1:
                    face = (previous[0], current[j], current[i])
                elif len(current) == 1:
                    face = (previous[i], previous[j], current[0])
                else:
                    face = (previous[i], previous[j], current[j], current[i])
                faces.append(face)
                bands.append(material)
        previous = current
    obj = mesh(name, verts, faces, finish)
    slots = {finish: 0}
    for poly, material in zip(obj.data.polygons, bands):
        if material not in slots:
            slots[material] = len(slots)
            obj.data.materials.append(materials[material])
        poly.material_index = slots[material]
    return obj


def cast_handles(name, curves, finish, width, depth, x=0, z=0, scale=1):
    """Mirror a solid oval casting around the vessel, with both ends bedded in metal."""
    path = []
    for curve in curves:
        a, b, c, d = [Vector(p) for p in curve]
        for i in range(13):
            if path and i == 0:
                continue
            t = i / 12
            path.append((1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d)
    for side in (-1, 1):
        verts, faces = [], []
        for i, center in enumerate(path):
            tangent = (path[min(i+1, len(path)-1)] - path[max(0, i-1)]).normalized()
            # Slightly wider at the two solder joints; stable frame around the bends.
            flare = 1 + .35 * (2*i/(len(path)-1)-1)**4
            for j in range(10):
                angle = math.tau * j / 10
                offset = width * flare * math.cos(angle)
                verts.append((x + side*scale*(center.x - tangent.y*offset),
                              side*scale*depth*math.sin(angle),
                              z + scale*(center.y + tangent.x*offset)))
        for i in range(len(path)-1):
            for j in range(10):
                a = i*10+j
                b = i*10+(j+1)%10
                faces.append((a, a+10, b+10, b))
        faces += [tuple(range(10)), tuple(reversed(range(len(verts)-10, len(verts))))]
        mesh(name, verts, faces, finish)


def cup(name, x, z, scale, finish, handles=True, segments=48, handle_finish=None):
    profile = [(0,0),(.32,0),(.355,.018),(.355,.050),(.33,.070),(.26,.087),
               (.165,.119),(.112,.18),(.088,.26),(.083,.34),(.10,.388),
               (.142,.412),(.145,.438),(.128,.456),(.15,.494),(.219,.538),
               (.307,.608),(.39,.702),(.466,.815),(.528,.949),(.558,1.065),
               (.565,1.154),(.579,1.168),(.580,1.19),(.568,1.204),
               (.549,1.201),(.54,1.181),(.533,1.067),(.503,.957),
               (.444,.828),(.371,.721),(.287,.635),(.19,.578),(.095,.551),(0,.546)]
    turning(name, profile, finish, x, z, scale, segments)
    if handles:
        cast_handles('Cast ear handles',
            [((.553,1.14),(.646,1.13),(.735,1.244),(.792,1.135)),
             ((.792,1.135),(.85,1.00),(.73,.83),(.602,.805)),
             ((.602,.805),(.51,.782),(.455,.801),(.411,.751))],
            handle_finish or finish,.031,.044,x,z,scale)


def plinth(name, radius, finish, trim):
    turning(name, [(0,0),(.93,0),(.993,.018),(1,.040),(1,.067),
                   (.973,.083),(.951,.094),(.951,.113,trim),(.94,.124),
                   (.924,.222),(.904,.245),(.878,.252),(0,.252)], finish, scale=radius)


def folded_standard():
    # Two folded sheets fan apart in depth. Matching projected sections keep
    # the metal skins clear of one another from socket to tip.
    for name, side in [('Near standard',-1), ('Far standard',1)]:
        cols, rows = 40, 24
        def point(u,v):
            phase = math.tau*(1.18*u + .075*v)
            along = -1.12*u + .94*v + .075*u*math.sin(phase)
            fold = .36*(math.sin(phase)-math.sin(math.tau*.075*v))
            depth = fold + side*(.105 + .25*v + .17*u)
            height = 1.06*u + 1.32*v + .055*u*math.sin(phase)
            return Vector((along,depth,.67+height))
        # Raise the cloth slightly above the socket on a short exposed silver staff.
        staff_start = point(0,0) - (point(0,1)-point(0,0))*.10
        tube(name+' staff',[staff_start, point(0,1)],.026,'silver',caps=True)
        verts, faces, tiles = [], [], []
        for j in range(rows+1):
            for i in range(cols+1):
                verts.append(point(i/cols,j/rows))
        for j in range(rows):
            for i in range(cols):
                a = j*(cols+1)+i
                faces.append((a,a+1,a+cols+2,a+cols+1))
                tiles.append((i//10+j//6)%2)
        obj = mesh(name, verts, faces, 'silver')
        obj.data.materials.append(materials['graphite'])
        for poly, tile in zip(obj.data.polygons, tiles):
            poly.material_index = tile
        shell = obj.modifiers.new('Folded metal sheet', 'SOLIDIFY')
        shell.thickness = .018
        shell.offset = 0
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=shell.name)


def build(key):
    global collection
    collection=bpy.data.collections.new(key);bpy.context.scene.collection.children.link(collection)
    if key=='grassroots-win':
        plinth('Turned walnut base',.53,'wood','gold')
        cup('Gold club cup',0,.13,1,'gold')
    elif key=='grassroots-championship':
        box('Walnut foot',(0,0,.075),(2.75,1.00,.15),'wood',.05)
        box('Brass reveal',(0,0,.155),(2.66,.93,.035),'gold',.016)
        box('Walnut presentation deck',(0,0,.215),(2.61,.91,.115),'wood',.037)
        turning('Center riser',[(0,0),(.46,0),(.46,.04),(.415,.066),
                                (.402,.13),(.385,.145),(0,.145)],'wood',z=.27)
        cup('Championship cup',0,.41,1.18,'gold')
        for side in (-1,1):
            cup('Flanking goblet',side*.99,.27,.65,'gold',True,32)
    elif key=='challenger-win':
        plinth('Ebonized base',.62,'dark','silver')
        turning('Enamel and silver pedestal',
                [(0,.15),(.403,.15),(.434,.176),(.431,.213),(.403,.233),
                 (.342,.252),(.321,.279),(.314,.322,'blue'),(.314,.344),
                 (.286,.362),(.235,.44),(.214,.576),(.239,.603),
                 (.268,.616),(.268,.644),(.25,.658),(0,.658)],'silver')
        cup('Challenger silver cup',0,.658,1.075,'silver',handle_finish='gold')
    elif key=='challenger-championship':
        turning('Chromed drum and graphite socket',
                [(0,0),(.68,0),(.729,.018),(.742,.039),(.742,.066),
                 (.733,.079),(.712,.087),(.709,.099),(.709,.205,'silver'),
                 (.708,.217,'silver'),(.698,.230),(.693,.249),(.675,.258),
                 (.601,.258),(.585,.274),(.568,.302),(.415,.587),
                 (.403,.604),(.384,.612),(0,.612)],'graphite')
        folded_standard()
    elif key=='premier-win':
        plinth('Black lacquer foot',.70,'dark','gold')
        turning('Gilded pedestal',[(0,.174),(.433,.174),(.464,.192),(.466,.231),
                 (.432,.257),(.36,.267),(.292,.318),(.238,.401),(.183,.557),
                 (.171,.672),(.179,.733),(.229,.768),(.246,.79),(.246,.822),
                 (.225,.843),(0,.843)],'gold')
        cup('Victory chalice',0,.842,1.13,'silver',False)
        cast_handles('Gilded flying handles',
                [((.267,.356),(.391,.360),(.54,.526),(.72,.851)),
                 ((.72,.851),(.908,1.195),(.999,1.639),(.925,1.905)),
                 ((.925,1.905),(.865,2.121),(.754,2.126),(.628,2.108))],
                 'gold',.049,.072)
    else:
        turning('Black lacquer championship plinth',
                [(0,0),(.85,0),(.89,.014),(.905,.039),(.905,.068),(.89,.085),
                 (.866,.095),(.866,.116,'gold'),(.85,.126),(.836,.22),
                 (.815,.259),(.786,.28),(0,.28)],'dark')
        lathe('Broad silver championship chalice',[(0,.28),(.55,.28),(.53,.46),(.35,.75),(.30,1.03),(.4,1.4),(.61,1.9),(.84,2.45),(1.02,2.9),(1.02,3.03),(.96,3.03),(.95,2.9),(.77,2.45),(.55,1.92),(.32,1.42),(0,1.3)],'silver')
        ring('Wide polished rim',.99,3.03,'silver',.055)
        # Abstract flowing loops replace copyrighted/track-specific silhouettes.
        wall = [(1.03,.30),(1.40,.40),(1.90,.61),(2.45,.84),(2.90,1.02)]
        for j in range(7):
            pts=[]
            for i in range(96):
                a=math.tau*i/96;z=1.15+j*.255+.075*math.sin(3*a+j*.65)
                for (low, inner), (high, outer) in zip(wall,wall[1:]):
                    if low <= z <= high:
                        r = inner + (outer-inner)*(z-low)/(high-low) + .012
                        break
                pts.append((r*math.cos(a),r*math.sin(a),z))
            tube('Encircling championship loop %d'%j,pts,.035,'silver',True)
        ring('Gold champion collar',.457,.59,'gold',.027)
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
# Open the editable lineup from the front, at the same elevation as the game viewer.
from mathutils import Euler
bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.region_3d.view_rotation = Euler((math.radians(80),0,0)).to_quaternion()
            space.region_3d.view_location = (0,0,1.4)
            space.region_3d.view_distance = 23
            space.region_3d.view_perspective = 'ORTHO'
            space.shading.color_type = 'MATERIAL'
            space.overlay.show_overlays = False
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'empire-trophies.blend'))
(OUT/'trophy-models.js').write_text('// Generated by tools/build_trophies.py; original Stock Car Empire geometry.\nconst SC_TROPHY_MODELS = '+json.dumps(bank,separators=(',',':'))+';\n',encoding='utf-8')

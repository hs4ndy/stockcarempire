"""Build the original Empire Gen-7 stock car and its shared browser geometry.

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
    'paint': material('paint', (.028, .038, .052), .55, .29),
    'accent': material('accent', (.70, .035, .018), .15),
    'trim': material('trim', (.014, .018, .021), .05, .5),
    'glass': material('glass', (.035, .075, .10), .42, .17),
    'metal': material('metal', (.16, .19, .22), .75, .3),
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

# Gen-7/P3 body fits the existing 4.6-unit contact envelope.
AXLE=1.30
def arch_bottom(z):
    h=.165
    for axle in [-AXLE,AXLE]:
        d=abs(z-axle)
        if d<.437: h=max(h,.40+math.sqrt(.437**2-d**2))
    return h

def width(z):
    return interp(z,[(-2.27,1.0),(-2.10,1.015),(-1.30,1.035),(-.76,1.018),(.70,1.018),(1.30,1.035),(1.99,1.01),(2.27,1.0)])

def deck(z):
    return interp(z,[(-2.27,.78),(-1.90,.82),(-1.45,.835),(-.80,.845),(.85,.815),(1.30,.785),(1.85,.727),(2.27,.635)])

def grid(name,rows,mat,smooth=True):
    n=len(rows[0])
    return mesh(name,[p for row in rows for p in row],
                [(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i)
                 for j in range(len(rows)-1) for i in range(n-1)],mat,smooth)

# Hood center independent of fender crowns; actual open wheel wells.
zs=sorted(set([-2.27,-2.21,-2.10,-1.94,-.76,-.50,0,.50,.76,1.94,2.10,2.21,2.27]+
    [round(axle+.437*math.cos(i*math.pi/18),6) for axle in [-AXLE,AXLE] for i in range(19)]))
rows=[]
for z in zs:
    w=width(z); b=arch_bottom(z); d=deck(z); s=max(d+.027,b+.026)
    profile=[(-w*.970,b),(-w,b+(s-b)*.62),(-w,s-.006),(-w*.970,s+.012),
             (-w*.87,s+.020),(-w*.67,d+.014),(0,d+.024),
             (w*.67,d+.014),(w*.87,s+.020),(w*.970,s+.012),(w,s-.006),
             (w,b+(s-b)*.62),(w*.970,b)]
    # The shell's end rings follow the same rounded plan-view as the fascia.
    # This closes the previous gaps between the front/rear caps and quarters.
    def shell_z(x):
        if z>1.94: return z-.245*(abs(x)/1.025)**4*((z-1.94)/.33)
        if z< -1.94: return z+.11*(abs(x)/1.02)**5*((-z-1.94)/.33)
        return z
    rows.append([(x,y,shell_z(x)) for x,y in profile])
grid('Continuous composite shell',rows,'paint')
box('Flat underfloor',(0,.136,0),(1.79,.038,4.40),'trim',.02)

def nose(x,y,offset=0):
    return (x,y,2.273-.245*(abs(x)/1.025)**4-max(0,.30-y)*.11+offset)

xs=[-1.0,-.95,-.86,-.72,-.50,0,.50,.72,.86,.95,1.0]
grid('Rounded front bumper',[[nose(x,y) for x in xs] for y in [.145,.28,.49,.615]],'paint')
grid('Nose upper shoulder',[[nose(x,.615) for x in xs],
    [(x,interp(abs(x),[(0,.659),(.67,.649),(.87,.682),(.97,.674),(1,.656)]),nose(x,.615)[2]-.003) for x in xs]],'paint')

def graphic(name,path,mat,thickness=.008,surface=nose):
    sampled=[]
    for a,b in zip(path,path[1:]):
        sampled.extend((a[0]+(b[0]-a[0])*i/12,a[1]+(b[1]-a[1])*i/12) for i in range(12))
    sampled.append(path[-1])
    rows=[]
    for i,(x,y) in enumerate(sampled):
        a=sampled[max(0,i-1)]; b=sampled[min(len(sampled)-1,i+1)]
        dx,dy=b[0]-a[0],b[1]-a[1]
        length=math.hypot(dx,dy)
        ox,oy=-dy/length*thickness/2,dx/length*thickness/2
        rows.append([surface(x-ox,y-oy,.006),surface(x+ox,y+oy,.006)])
    return grid(name,rows,mat,False)

def fascia_patch(name,path,mat,surface=nose):
    # Subdivide onto the curved fascia, otherwise a flat polygon disappears
    # behind the painted bumper between its corners.
    a,b,c,d=path
    rows=[]
    for j in range(5):
        t=j/4
        left=(a[0]*(1-t)+d[0]*t,a[1]*(1-t)+d[1]*t)
        right=(b[0]*(1-t)+c[0]*t,b[1]*(1-t)+c[1]*t)
        rows.append([surface(left[0]+(right[0]-left[0])*i/16,left[1]+(right[1]-left[1])*i/16,.004) for i in range(17)])
    return grid(name,rows,mat,False)

fascia_patch('Wide lower radiator opening',[(-.70,.155),(.70,.155),(.53,.405),(-.53,.405)],'trim')
for x in [-.48,-.32,-.16,0,.16,.32,.48]:
    tube('Radiator vane',nose(x,.17,.010),nose(x,.38,.010),.003,'metal',4)
for side in [-1,1]:
    fascia_patch('Vertical brake inlet',[(side*.79,.18),(side*.94,.18),(side*.92,.455),(side*.81,.47)],'trim')
    graphic('Inlet edge',[(side*.94,.18),(side*.95,.44),(side*.85,.47)],'accent',.006)
    graphic('Continuous upper lamp signature',[(0,.559),(side*.52,.565),(side*.71,.58),(side*.94,.615)],'accent',.010)
    graphic('Slim lower lamp signature',[(0,.514),(side*.52,.52),(side*.68,.514),(side*.91,.563),(side*.94,.615)],'accent',.006)
    graphic('Lower nose pinstripe',[(0,.442),(side*.53,.442),(side*.76,.153)],'accent',.007)
split_outline=[(-1.07,.113,1.87),(-1.065,.113,2.06),(-.97,.113,2.23),(-.70,.113,2.295),
               (.70,.113,2.295),(.97,.113,2.23),(1.065,.113,2.06),(1.07,.113,1.87)]
mesh('Stepped front splitter',split_outline,[tuple(range(8))],'trim')
for side in [-1,1]:
    tube('Splitter stay',(side*.85,.14,2.22),(side*.87,.29,2.17),.008,'metal',6)
    for z in [1.65,1.76]:
        tube('Hood pin',(side*.58,deck(z)+.026,z),(side*.58,deck(z)+.034,z),.023,'metal',8)

# Shaped roof and compound-curved front/rear glazing.
roof_z=[-.78,-.66,-.44,-.16,.12,.31,.43]
def roof_center(z):
    return interp(z,[(-.78,1.23),(-.66,1.275),(-.44,1.299),(-.16,1.302),(.12,1.29),(.31,1.263),(.43,1.223)])
def roof_width(z):
    return interp(z,[(-.78,.714),(-.44,.747),(-.16,.75),(.12,.745),(.43,.711)])
grid('Compound crowned roof',[[(f*roof_width(z),roof_center(z)-.052*abs(f)**3,z)
    for f in [-1,-.96,-.84,-.60,0,.60,.84,.96,1]] for z in roof_z],'paint')
for rear in [False,True]:
    rows=[]
    for j in range(7):
        t=j/6
        z=(.42*(1-t)+.94*t) if not rear else (-.77*(1-t)-1.54*t)
        w=(.68*(1-t)+.887*t) if not rear else (.682*(1-t)+.895*t)
        y=(1.22*(1-t)+.844*t) if not rear else (1.23*(1-t)+.862*t)
        rows.append([(f*w,y+.018*(1-f*f),z+.037*(1-f*f)*math.sin(t*math.pi)*(1 if not rear else -1))
                     for f in [-1,-.8,-.4,0,.4,.8,1]])
    grid('Raked rear glass' if rear else 'Curved windshield',rows,'glass')
    for x in [-.28,.28]:
        brace=[]
        for j in range(5):
            t=j/4
            z=(.42*(1-t)+.94*t) if not rear else (-.77*(1-t)-1.54*t)
            w=(.68*(1-t)+.887*t) if not rear else (.682*(1-t)+.895*t)
            y=(1.22*(1-t)+.844*t) if not rear else (1.23*(1-t)+.862*t)
            brace.append((x,y+.018*(1-(x/w)**2)+.007,z+.037*(1-(x/w)**2)*math.sin(t*math.pi)*(1 if not rear else -1)))
        for a,b in zip(brace,brace[1:]):
            tube('Rear retention strip' if rear else 'Windshield brace',a,b,.007,'metal',5)
for side in [-1,1]:
    def side_panel(name,pts,mat='paint'):
        return mesh(name,[(side*x,y,z) for x,y,z in pts],[tuple(range(len(pts)))],mat)
    side_panel('Swept A pillar',[(.713,1.185,.43),(.756,1.17,.40),(.951,.847,.89),(.884,.847,.956)])
    outer=[(.767,1.226,-.43),(.716,1.18,-.77),(.966,.85,-1.54),(.94,.884,-.45)]
    # Close the rail between the raked backlight and the side quarter panel.
    side_panel('Backlight edge rail',[(.682,1.23,-.77),(.716,1.18,-.77),(.966,.85,-1.54),(.895,.862,-1.54)])
    inner=[(.798,1.165,-.53),(.805,1.124,-.83),(.934,.897,-1.30),(.928,.904,-.55)]
    mesh('Sculpted quarter-window surround',[(side*x,y,z) for x,y,z in outer+inner],
         [(i,(i+1)%4,(i+1)%4+4,i+4) for i in range(4)],'paint',True)
    grid('Roof-side stamped rail',[
        [(side*(roof_width(z)+dx),roof_center(z)-dy,z) for dx,dy in [(0,.045),(.022,.069)]]
        for z in roof_z],'paint')
    side_panel('Window belt rail',[(.922,.89,.85),(.948,.842,.90),(.960,.855,-1.50),(.934,.885,-1.43)])
    side_panel('B pillar',[(.767,1.226,-.34),(.767,1.23,-.43),(.94,.884,-.45),(.94,.884,-.36)],'trim')
    side_panel('Triangular quarter glass',inner,'glass')
    tube('Quarter brace',(side*.925,.91,-1.29),(side*.83,1.085,-.70),.010,'metal',6)
    box('Rocker skirt',(side*.991,.168,0),(.072,.07,1.80),'trim',.012)
    box('Rocker highlight',(side*1.029,.209,0),(.009,.018,1.69),'accent')
    box('Exhaust heat shield',(side*1.032,.272,-.65),(.014,.13,.43),'metal',.018)
    tube('Exhaust dark bore',(side*1.040,.27,-.69),(side*1.047,.27,-.69),.061,'trim',16)
    for i in range(16):
        a=i*math.tau/16; b=(i+1)*math.tau/16
        tube('Exhaust rolled edge',(side*1.05,.27+.065*math.sin(a),-.69+.065*math.cos(a)),
             (side*1.05,.27+.065*math.sin(b),-.69+.065*math.cos(b)),.007,'metal',5)
    for z in [-.49,-.40,-.31,-.22]:
        box('Skirt cooling slot',(side*1.03,.27,z),(.010,.072,.037),'trim')
    for axle in [-AXLE,AXLE]:
        arc=[]
        for i in range(25):
            a=i*math.pi/24; z=axle+.438*math.cos(a)
            arc.append([(side*(width(z)+.001),.40+r*math.sin(a),axle+r*math.cos(a)) for r in [.438,.450]])
        grid('Rolled arch lip',arc,'paint')
    for z in [1.09,1.16,1.23,1.30,1.37]:
        box('Recessed hood extractor',(side*.52,deck(z)+.021,z),(.26,.011,.028),'trim',.004)
box('Dark cockpit tub',(0,.73,-.16),(1.55,.20,1.55),'trim')
box('Driver seat back',(-.40,.955,-.42),(.39,.43,.12),'trim',.05)
for side in [-1,1]:
    tube('Internal main hoop',(side*.68,.81,-.48),(side*.64,1.20,-.48),.020,'metal',6)
    tube('Cage roof side',(side*.64,1.19,-.48),(side*.65,1.14,.38),.018,'metal',6)
    tube('Cage door brace',(side*.85,.86,-.32),(side*.69,1.14,.35),.018,'metal',6)
tube('Cage cross member',(-.64,1.20,-.48),(.64,1.20,-.48),.020,'metal',6)
tube('Cage diagonal',(-.64,.81,-.49),(.64,1.20,-.49),.020,'metal',6)
def window_x(y):
    return -.94+(y-.895)/.30*.171
for z in [-.27,-.16,-.05,.06,.17,.28,.39,.50]:
    top=min(1.18,1.18-max(0,z-.30)*.65)
    tube('Window net vertical',(window_x(.91),.91,z),(window_x(top),top,z),.006,'trim',4)
for y in [.92,.97,1.02,1.07,1.12,1.17]:
    tube('Window net horizontal',(window_x(y),y,-.27),(window_x(y),y,.50-max(0,y-1.05)*1.5),.006,'trim',4)

def tail(x,y,offset=0):
    return (x,y,-2.277+.11*(abs(x)/1.02)**5-offset)
grid('Upright rear fascia',[[tail(x,y) for x in xs] for y in [.22,.37,.61,.785]],'paint')
grid('Rear deck trailing edge',[[tail(x,.785) for x in xs],
    [(x,interp(abs(x),[(0,.804),(.67,.794),(.87,.827),(.97,.819),(1,.801)]),tail(x,.785)[2]+.006) for x in xs]],'paint')
fascia_patch('Rear recessed bumper panel',[(-.80,.44),(.80,.44),(.87,.68),(-.87,.68)],'trim',tail)
for side in [-1,1]:
    graphic('Slim rear light',[(side*.47,.643),(side*.78,.644),(side*.88,.685)],'taillight',.034,tail)
    graphic('Rear shoulder outline',[(side*.43,.696),(side*.82,.696),(side*.91,.73)],'accent',.008,tail)
mesh('Rear diffuser ramp',[(-.84,.14,-1.88),(.84,.14,-1.88),(.84,.29,-2.275),(-.84,.29,-2.275)],[(0,1,2,3)],'trim')
for x in [-.79,-.40,0,.40,.79]:
    mesh('Diffuser strake',[(x,.125,-1.85),(x,.145,-2.28),(x,.29,-2.28),(x,.145,-1.85)],[(0,1,2,3)],'trim')
mesh('Deck blade spoiler',[(-.97,.83,-2.05),(.97,.83,-2.05),(.98,1.013,-2.19),(-.98,1.013,-2.19),
                           (-.97,.83,-2.03),(.97,.83,-2.03),(.98,1.013,-2.17),(-.98,1.013,-2.17)],
     [(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],'trim')
for side in [-1,1]:
    mesh('Spoiler end fence',[(side*.977,.83,-1.99),(side*.977,.83,-2.22),(side*.977,1.018,-2.22)],[(0,1,2)],'trim')
    tube('Fuel surround',(side*1.016,.721,-1.90),(side*1.026,.721,-1.90),.068,'trim',16)
    tube('Fuel cap',(side*1.027,.721,-1.90),(side*1.03,.721,-1.90),.048,'metal',12)
for z in [-.58,-.10]:
    grid('Roof flap transverse seam',[
        [(x,roof_center(z)+.001-.052*abs(x/roof_width(z))**3,z+dz) for dz in [-.003,.003]]
        for x in [-.43,-.20,0,.20,.43]],'trim',False)
for x in [-.43,.43]:
    grid('Roof flap longitudinal seam',[
        [(x+dx,roof_center(z)+.002-.052*abs(x/roof_width(z))**3,z) for dx in [-.003,.003]]
        for z in [-.58,-.44,-.16,-.10]],'trim',False)

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
    # Rim rings and ten split-Y forged spokes around a single center lock.
    disk=[(side*.13,0,0)]+[(side*.13,.261*math.sin(i*math.tau/n),.261*math.cos(i*math.tau/n)) for i in range(n)]
    wheel_mesh('Recessed brake disc',disk,[(0,1+i,1+(i+1)%n) for i in range(n)],'trim',False)
    vs=[]
    for x,r in [(side*.166,.305),(side*.170,.284),(side*.151,.263)]:
        vs += [(x,r*math.sin(i*math.tau/n),r*math.cos(i*math.tau/n)) for i in range(n)]
    fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(2) for i in range(n)]
    wheel_mesh('Forged wheel lip',vs,fs,'metal')
    vs=[]; fs=[]
    for i in range(10):
        a=i*math.tau/10
        for radii in [[(.070,-.17),(.18,-.068),(.18,.068),(.070,.17)],
                      [(.16,-.07),(.285,-.19),(.285,-.125),(.19,.02)],
                      [(.19,-.02),(.285,.125),(.285,.19),(.16,.07)]]:
            p=len(vs)
            vs += [(side*.169,r*math.sin(a+da),r*math.cos(a+da)) for r,da in radii]
            fs.append((p,p+1,p+2,p+3))
    wheel_mesh('Ten split-Y forged spokes',vs,fs,'metal',False)
    vs=[(side*.173,0,0)]+[(side*.173,.075*math.sin(i*math.tau/8),.075*math.cos(i*math.tau/8)) for i in range(8)]
    wheel_mesh('Center lock',vs,[(0,1+i,1+(i+1)%8) for i in range(8)],'metal',False)

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
                normal=(ev.matrix_world.to_3x3().inverted().transposed() @ data.corner_normals[li].vector).normalized()
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

def roof_overlay(half_width,zmin,zmax):
    # Number and teammate markings follow the crowned roof exactly. They do
    # not float above it or disappear inside it when viewed from behind.
    data={'position':[],'normal':[],'uv':[],'index':[]}
    nx,nz=8,16
    for j in range(nz+1):
        z=zmin+(zmax-zmin)*j/nz
        for i in range(nx+1):
            x=-half_width+2*half_width*i/nx
            data['position'] += [round(x,5),round(roof_center(z)-.052*abs(x/roof_width(z))**3+.004,5),round(z,5)]
            data['normal'] += [0,1,0]
            data['uv'] += [i/nx,1-j/nz]
    for j in range(nz):
        for i in range(nx):
            a=j*(nx+1)+i
            data['index'] += [a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2]
    return data

payload={'version':2,'name':'Empire Gen-7','wheelRadius':.40,
         'wheelPositions':[[-.87,.40,-AXLE],[.87,.40,-AXLE],[-.87,.40,AXLE],[.87,.40,AXLE]],
         'parts':bake(parts),'wheel':bake(wheel_parts,True)['wheel'],
         'roofDecal':roof_overlay(.49,-.69,.29),'teamBand':roof_overlay(.70,.18,.27)}
(OUT/'stock-car-model.js').write_text('// Generated by tools/build_stock_car.py. Original generic Gen-7-inspired geometry.\nconst SC_STOCK_CAR_MODEL = '+json.dumps(payload,separators=(',',':'))+';\n',encoding='utf8')

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

lettering('Roof race number','27',(0,1.312,-.20),.83,(0,0,0))
lettering('Left door race number','27',(-1.021,.56,.04),.50,(math.pi/2,0,-math.pi/2))
lettering('Right door race number','27',(1.021,.56,.04),.50,(math.pi/2,0,math.pi/2))
lettering('Rear deck wordmark','EMPIRE',(0,.853,-1.88),.19,(0,0,math.pi))
model_objects=list(bpy.context.scene.objects)
for ob in model_objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'empire-gen7.glb'),use_selection=True,export_format='GLB')

# Neutral studio with three livery studies. Studio is excluded from the GLB.
for title,offset,color in [('Cobalt',(3.4,1.2,0),(.018,.12,.40)),('Ivory',(-3.4,1.2,0),(.70,.72,.68))]:
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
cam.location=(9,-14,7)
cam.rotation_euler=(Vector((0,.2,.55))-cam.location).to_track_quat('-Z','Y').to_euler()
cam_data.type='ORTHO'; cam_data.ortho_scale=12.0
scene.camera=cam
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1600; scene.render.resolution_y=1050; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'gen7-lineup.png')
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.65
for screen in bpy.data.screens:
    for area_ui in screen.areas:
        if area_ui.type=='VIEW_3D':
            area_ui.spaces.active.region_3d.view_perspective='CAMERA'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'empire-gen7.blend'))
bpy.ops.render.render(write_still=True)
# Single-car front/side/rear studies share the exact exported model.
for ob in scene.objects:
    if ob.name.startswith(('Cobalt /','Ivory /')): ob.hide_render=True
scene.render.resolution_x=1440; scene.render.resolution_y=900
for view,loc,scale in [('front',(5,-8,3.1),6.6),('side',(-8,0,1.75),5.9),('rear',(-5,8,3.4),6.6)]:
    cam.location=loc
    cam.rotation_euler=(Vector((0,0,.60))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam_data.ortho_scale=scale
    scene.render.filepath=str(OUT/('gen7-'+view+'.png'))
    bpy.ops.render.render(write_still=True)
print('GEN7_EXPORT',json.dumps({'bodyTriangles':sum(len(p['index'])//3 for p in payload['parts'].values()),'wheelTriangles':len(payload['wheel']['index'])//3,'materials':list(payload['parts'])}))

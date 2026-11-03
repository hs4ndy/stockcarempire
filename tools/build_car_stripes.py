"""Build conforming paint-overlay stripes and a separate Blender inspection file."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def model(file):
 s=(ROOT/file).read_text(encoding='utf-8');return json.loads(s[s.index('{'):s.rfind('}')+1])
m=model('assets/cars/stock-car-model.js');paint=m['parts']['paint'];pos=paint['position'];indices=paint['index'];vertices=[];faces=[]
def clip(poly,limit,greater,axis=0):
 out=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  ina=a[axis]>=limit if greater else a[axis]<=limit;inb=b[axis]>=limit if greater else b[axis]<=limit
  if ina:out.append(a)
  if ina!=inb:
   t=(limit-a[axis])/(b[axis]-a[axis]);out.append([a[k]+(b[k]-a[k])*t for k in range(3)])
 return out
for i in range(0,len(indices),3):
 tri=[pos[k*3:k*3+3] for k in indices[i:i+3]]
 a,b,c=tri;u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)];ny=u[2]*v[0]-u[0]*v[2]
 norm=math.sqrt(sum(x*x for x in [u[1]*v[2]-u[2]*v[1],ny,u[0]*v[1]-u[1]*v[0]]))
 if not norm or abs(ny)/norm<.65 or min(p[1] for p in tri)<.5:continue
 for lo,hi in [(-.44,-.23),(.23,.44)]:
  poly=clip(clip(tri,lo,True),hi,False)
  # The continuous shell also crosses the interior beneath the glazing.
  # Restrict overlays to the visible hood, roof and rear deck, never that cabin floor.
  panels=[clip(poly,1.15,True,1)] if min(p[1] for p in tri)>1.1 else [clip(poly,.96,True,2),clip(poly,-1.55,False,2)]
  for panel in panels:
   for k in range(1,len(panel)-1):
    base=len(vertices);vertices.extend([[p[0],p[1]+.006,p[2]] for p in [panel[0],panel[k],panel[k+1]]]);faces.append([base,base+1,base+2])
payload={'position':[round(c,6) for p in vertices for c in p],'index':[k for f in faces for k in f]}
(ROOT/'assets/cars/racing-stripes.js').write_text('const SC_RACING_STRIPES = '+json.dumps(payload,separators=(',',':'))+';\n',encoding='utf-8')
try:
 import bpy
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/cars/empire-gen7.blend'))
 mesh=bpy.data.meshes.new('Conforming racing stripes');mesh.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);mesh.update()
 ob=bpy.data.objects.new('Toggleable Racing Stripes',mesh);bpy.context.collection.objects.link(ob)
 mat=bpy.data.materials.new('Racing stripe color');mat.diffuse_color=(1,1,1,1);ob.data.materials.append(mat)
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/cars/empire-gen7-striped.blend'))
except ImportError:pass
print('Stripe overlay triangles',len(faces))

"""Build the editable SC-01/Gen-7 finish details and the matching game buffers.

Run in background Blender with --python tools/build_car_finish.py. Coordinates
in the modeling helpers are game coordinates (Y up, +Z towards the nose).
"""
import json
import math
from itertools import groupby
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
import grassroots_nose

OUT = Path(__file__).resolve().parents[1] / "assets" / "cars"
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
colors = {
    "paint": (.10, .22, .35), "accent": (.88, .88, .83),
    "trim": (.017, .022, .028), "metal": (.34, .39, .43),
    "glass": (.043, .087, .12), "headlight": (.84, .90, .93),
    "taillight": (.51, .012, .024), "wheel": (.05, .055, .060),
}
materials = {}
for name, color in colors.items():
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    materials[name] = mat

wheel_mat = materials["wheel"]
wheel_mat.use_nodes = True
wheel_attr = wheel_mat.node_tree.nodes.new("ShaderNodeVertexColor")
wheel_attr.layer_name = "Wheel finish"
wheel_mat.node_tree.links.new(wheel_attr.outputs["Color"],
                              wheel_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"])


def triples(values):
    return [values[i:i + 3] for i in range(0, len(values), 3)]


def blender_point(point):
    x, y, z = point
    return (x, -z, y)


def object_mesh(name, points, faces, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([blender_point(p) for p in points], [], faces)
    mesh.materials.append(materials[material])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location.x = offset
    return obj


def add_detail(name, material, rows):
    """One strip, grouped by material in the race and individually editable in Blender."""
    add_grid(name, material, rows)


def add_grid(name, material, rows, reverse=False, shading=None):
    columns = len(rows[0])
    vertices = [p for row in rows for p in row]
    faces = []
    for row in range(len(rows) - 1):
        for col in range(columns - 1):
            i = row * columns + col
            faces.extend([(i,i+1,i+columns),(i+columns,i+1,i+columns+1)])
    if reverse:
        faces = [face[::-1] for face in faces]
    obj = object_mesh(name, vertices, faces, material)
    bucket = details.setdefault(material, {"position": [], "normal": [], "index": []})
    start = len(bucket["position"]) // 3
    if shading is not None:
        for face in obj.data.polygons:
            face.use_smooth = True
        obj.data.normals_split_custom_set([blender_point(shading[loop.vertex_index]) for loop in obj.data.loops])
    for i,(point, vertex) in enumerate(zip(vertices, obj.data.vertices)):
        normal = vertex.normal
        bucket["position"].extend(round(v, 5) for v in point)
        bucket["normal"].extend(round(v, 5) for v in (shading[i] if shading is not None else (normal.x, normal.z, -normal.y)))
    bucket["index"].extend(start + i for face in faces for i in face)


def fascia(name, material, stations, end, side, lift):
    # Raycast onto the actual tessellated bumper, including its recessed trim.
    # Each station supplies the lower and upper edge of the graphic.
    rows = []
    for x, low, high in stations:
        row = []
        for y in (low, high):
            hit, _, _, _ = bumper.ray_cast((side * x, y, end * 4), (0, 0, -end))
            if hit is None:
                raise ValueError(f"{name}: missed bumper at {x}, {y}")
            row.append((side * x, y, hit.z + end * lift))
        if side == end:
            row.reverse()
        rows.append(row)
    add_detail(name, material, rows)


def shape_gen7():
    # Start from the original nose and give its paper-thin splitter a rolled edge.
    outline = [(-1.07,1.87),(-1.065,2.06),(-.97,2.23),(-.70,2.295),
               (.70,2.295),(.97,2.23),(1.065,2.06),(1.07,1.87)]
    add_detail("Splitter edge return", "trim",
               [[(x,.113,z),(x*.997,.102,1.87+(z-1.87)*.993)] for x,z in outline])


def gen7_brow(part):
    # The original hood and bumper use different samples around the curved
    # corners. Trace both actual edges before lofting a common return between them.
    positions = triples(part["position"])
    normals = triples(part["normal"])
    hood_edge, bumper_edge = {}, {}
    for point, normal in zip(positions,normals):
        x,y,z = point
        depth = 2.273 - .245*(abs(x)/1.025)**4
        if abs(z - (depth-.003)) < .00003 and y > .64 and normal[1] > .28:
            hood_edge[x] = (point,normal)
        if abs(z-depth) < .00003 and abs(y-.615) < .00003 and abs(normal[1]) < .012:
            bumper_edge[x] = (point,normal)
    def sample(edge, x):
        keys = sorted(edge)
        for a,b in zip(keys,keys[1:]):
            if a <= x <= b:
                t = (x-a)/(b-a)
                return [Vector(first).lerp(Vector(second),t)
                        for first,second in zip(edge[a],edge[b])]
        raise ValueError("Open Gen-7 front shoulder")
    columns = sorted(hood_edge.keys() | bumper_edge.keys())
    rows, shading = [], []
    for t in (0,.42,.76,1):
        row = []
        for x in columns:
            low, ln = sample(bumper_edge,x)
            high, hn = sample(hood_edge,x)
            pt = low.lerp(high,t)
            pt.z += .006*math.sin(math.pi*t)
            row.append(tuple(pt))
            shading.append(ln.lerp(hn,t*t).normalized())
        rows.append(row)
    add_grid("Rolled original bumper brow","paint",rows,shading=shading)


def crown_height(x,z):
    along = max(0, 1-((z+.21)/.645)**2)
    across = max(0, 1-(abs(x)/.76)**2)
    return 1.288 + .015*across + .012*along + .021*across*along


def roof_width(z):
    return .74+.025*max(0,1-((z+.21)/.645)**2)


def roof_and_pillars():
    stations = (-.86,-.76,-.58,-.4,-.21,0,.2,.35,.435)
    across = (-1,-.93,-.7,-.4,0,.4,.7,.93,1)
    rows = [[(roof_width(z)*t,crown_height(roof_width(z)*t,z),z) for t in across]
            for z in stations]
    add_grid("One-piece crowned roof","paint",rows,reverse=True)
    for edge,glass_z,glass_y in [(rows[0],-.85,1.29),(rows[-1],.43,1.30)]:
        add_grid("Roof window reveal","paint",[edge,[(.74*t,glass_y,glass_z) for t in across]])
    for side in (-1,1):
        glass_top = lambda z: (.755*side,1.28,z)
        add_grid("Roof drip rail","paint",[[(side*roof_width(z),crown_height(roof_width(z),z),z),
                 glass_top(max(-.83,min(.41,z)))] for z in stations])
        for name,wind_top,wind_base,side_top,side_base in [
            ("A pillar",(.74,1.30,.43),(.87,.92,.99),(.755,1.28,.41),(.94,.915,.85)),
            ("Rear sail panel",(.74,1.29,-.85),(.89,.91,-1.50),(.755,1.28,-.83),(.94,.915,-1.30))]:
            panel = []
            for t in (0,.3,.7,1):
                wind = Vector(wind_top).lerp(Vector(wind_base),t)
                sill = Vector(side_top).lerp(Vector(side_base),t)
                ridge = wind.lerp(sill,.55)
                ridge.x += .009
                panel.append([(side*p.x,p.y,p.z) for p in (wind,ridge,sill)])
            add_grid(name,"paint",panel)


def roof_overlay(width, back, front):
    data = {"position":[],"normal":[],"uv":[],"index":[]}
    for j in range(9):
        z = back + (front-back)*j/8
        for i in range(9):
            x = width*(i/4-1)
            data["position"].extend((round(x,5),round(crown_height(x,z)+.0035,5),round(z,5)))
            data["normal"].extend((0,1,0))
            data["uv"].extend((i/8,1-j/8))
            if i<8 and j<8:
                a = j*9+i
                data["index"].extend((a,a+9,a+1,a+1,a+9,a+10))
    return data


def shape_sc01():
    for side in (-1, 1):
        # A single stamped lip follows each opening, including the drop to
        # the rocker. The old lip was a chain of separately capped tubes.
        for axle in (-1.42, 1.42):
            rows = []
            for angle in [i * math.pi / 28 for i in range(29)]:
                row = []
                for radius, outset in ((.457,.001),(.476,.007)):
                    z = axle + radius * math.cos(angle)
                    distance = abs(z)
                    width = (1.02 + .055 * distance / 1.42 if distance < 1.42
                             else 1.075 - (.025 if z < 0 else .045) * (distance - 1.42) / .83)
                    row.append((side * (width + outset), .40 + radius * math.sin(angle), z))
                rows.append(row if side == 1 else row[::-1])
            rows.insert(0, [(x,.20,z) for x,_,z in rows[0]])
            rows.append([(x,.20,z) for x,_,z in rows[-1]])
            add_detail("Rolled fender return", "paint", rows)
        for x in (.45,.62,.79):
            fascia("Tail lens upper bevel", "taillight",
                   [(x-.049,.609,.619),(x+.049,.611,.622)], -1, side, .004)


def side_sponsor():
    # The same UV rectangle reads left-to-right from either side. Sample the
    # shell at its crease so the artwork sits flush across the lower door.
    packet = {"position": [], "uv": [], "index": []}
    for side in (-1, 1):
        start = len(packet["position"]) // 3
        for y in (.331, .56, .793):
            for u in (0, .5, 1):
                z = -.39 + (.5 - u) * side * .84
                hit, _, _, _ = bumper.ray_cast((2 * side,y,z), (-side,0,0))
                if hit is None:
                    raise ValueError("Missing Premier side panel")
                packet["position"].extend((round(hit.x + side * .005,5), y, round(z,5)))
                packet["uv"].extend((u, round((y - .331) / .462,5)))
        for row in (0, 1):
            for col in (0, 1):
                a = start + row * 3 + col
                packet["index"].extend((a, a + 1, a + 3, a + 3, a + 1, a + 4))
    return packet


def wheel_finish(grassroots):
    # Machined bevel around the center-lock socket, shared by all four wheels.
    packet = {"position": [], "normal": [], "color": [], "index": []}
    for side in (-1, 1):
        if grassroots:
            # The original open spokes looked through the car to the opposite
            # wheel. Set a brake rotor behind each face of the shared wheel.
            center = len(packet["position"]) // 3
            for i in range(25):
                angle = (i - 1) * math.tau / 24
                radius = .266 if i else 0
                packet["position"].extend((side*.130,round(radius*math.sin(angle),5),
                                           round(radius*math.cos(angle),5)))
                packet["normal"].extend((side,0,0))
                packet["color"].extend((.075,.085,.093))
            for i in range(24):
                a, b = center + i + 1, center + (i+1)%24 + 1
                packet["index"].extend((center,b,a) if side > 0 else (center,a,b))
        for i in range(6):
            a, b = i * math.tau / 6, (i + 1) * math.tau / 6
            verts = [(side * depth, r * math.sin(t), r * math.cos(t))
                     for depth,r,t in ((.176,.062,a),(.176,.062,b),(.181,.036,b),(.181,.036,a))]
            base = len(packet["position"]) // 3
            slope = Vector((side, .21*math.sin((a+b)/2), .21*math.cos((a+b)/2))).normalized()
            for j, vertex in enumerate(verts):
                packet["position"].extend(round(c,5) for c in vertex)
                packet["normal"].extend(round(c,5) for c in slope)
                packet["color"].extend((.47,.51,.53) if j < 2 else (.22,.25,.27))
            idx = (0,1,2,0,2,3) if side < 0 else (0,2,1,0,3,2)
            packet["index"].extend(base + k for k in idx)
    return packet


def display_numbers(premier, grassroots):
    # Editable example numbers. Live racing uses the player's number texture.
    font = bpy.data.fonts.get("Arial Bold Italic") or bpy.data.fonts.load("C:/Windows/Fonts/arialbi.ttf")
    for side in (-1, 1):
        curve = bpy.data.curves.new("Door number", "FONT")
        curve.body = "27"
        curve.font = font
        curve.align_x = curve.align_y = "CENTER"
        curve.size = .53 if premier else .52 if grassroots else .50
        obj = bpy.data.objects.new("Door number", curve)
        collection.objects.link(obj)
        obj.location = (offset + side * (1.045 if grassroots else 1.026),
                        -.47 if premier else -.04, .58 if grassroots else .55)
        obj.rotation_euler = (math.pi / 2, 0, side * math.pi / 2)
        curve.materials.append(materials["accent"])
    roof_text = curve.copy()
    roof_text.size = .72
    obj = bpy.data.objects.new("Roof race number",roof_text)
    collection.objects.link(obj)
    obj.location = (offset,.21,1.342 if grassroots else 1.308)


def display_sponsor(packet):
    # A real in-game primary sponsor for the editable Premier example.
    image = bpy.data.images.load(str(OUT.parent / "sponsors/premier/horizon-national-bank.png"))
    image.pack()
    mat = bpy.data.materials.new("Horizon National Bank")
    mat.use_nodes = True
    texture = mat.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    shader = mat.node_tree.nodes["Principled BSDF"]
    mat.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    mat.node_tree.links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    obj = object_mesh("Primary sponsor", triples(packet["position"]), triples(packet["index"]), "trim")
    obj.data.materials[0] = mat
    uv = obj.data.uv_layers.new(name="Logo")
    for loop in obj.data.loops:
        i = 2 * loop.vertex_index
        uv.data[loop.index].uv = packet["uv"][i:i + 2]


payload = {}
for key, file, offset in [("grassroots","legacy-stock-car-model.js",-1.65),
                          ("gen7","stock-car-model.js",1.65)]:
    source = (OUT / file).read_text(encoding="utf8")
    model = json.loads(source[source.index("{"):source.rindex("}") + 1])
    collection = bpy.data.collections.new(model["name"])
    scene.collection.children.link(collection)
    points, triangles = [], []
    base_ranges = {}
    for name, part in model["parts"].items():
        vertices, faces = triples(part["position"]), triples(part["index"])
        if key == "grassroots":
            keep = [True] * len(faces)
            if name == "paint":
                # In the original bake the continuous body is the first mesh.
                # Only remove the capped arch tubes in the long later runs.
                def on_lip(index):
                    x,y,z = vertices[index]
                    return (1.0648 < abs(x) < 1.0912 and y >= .385 and
                            abs(math.hypot(abs(z)-1.42,y-.40)-.465) < .014)
                for match, group in groupby(enumerate(faces),lambda f: all(on_lip(i) for i in f[1])):
                    run = list(group)
                    if match and len(run) >= 280:
                        for i,_ in run:
                            keep[i] = False
                def on_roof(index):
                    x,y,z = vertices[index]
                    return y>=1.2474 and abs(x)<=.7601 and -.901<z<.461
                for match, group in groupby(enumerate(faces),lambda f: all(on_roof(i) for i in f[1])):
                    run = list(group)
                    if match and len(run) > 100:
                        for i,_ in run:
                            keep[i] = False
                # Replace the SC-01's three exposed round tubes on each side
                # with sheet-metal returns between the existing glass edges.
                for side in (-1,1):
                    for start,end,radius in [
                        ((.765,1.29,.43),(.91,.90,.98),.047),
                        ((.77,1.28,-.88),(.95,.91,-1.50),.070),
                        ((.77,1.30,-.83),(.77,1.30,.43),.022)]:
                        a,b = [Vector((side*x,y,z)) for x,y,z in (start,end)]
                        axis = (b-a).normalized()
                        members = set()
                        for i,xyz in enumerate(vertices):
                            delta = Vector(xyz)-a
                            along = delta.dot(axis)
                            if (-.0001 <= along <= (b-a).length+.0001 and
                                    abs((delta-axis*along).length-radius) < .0001):
                                members.add(i)
                        for i,f in enumerate(faces):
                            if members.issuperset(f):
                                keep[i] = False
            for i, f in enumerate(faces):
                pts = [vertices[k] for k in f]
                front = min(p[2] for p in pts)
                floor = min(p[1] for p in pts)
                # Keep the windshield pillars and small mirrors at the cowl.
                if name == "paint" and front >= .89999 and (front >= 1 or max(p[1] for p in pts) < .911):
                    keep[i] = False
                if (name == "accent" and front >= .989) or name == "headlight":
                    keep[i] = False
                if name == "metal" and front > 2.40:
                    keep[i] = False
                if name == "trim" and (front >= 2.10 or floor >= 1.322 or
                        all(y<=.1826 and abs(x)<=.931 and abs(z)<=2.301 for x,y,z in pts) or
                        (1.07 < front < 1.43 and floor > .76 and all(abs(p[0]) < .68 for p in pts))):
                    keep[i] = False
            if not all(keep):
                base_ranges[name] = []
                for retained, group in groupby(enumerate(keep), lambda entry: entry[1]):
                    run = list(group)
                    if retained:
                        base_ranges[name].append([run[0][0]*3,(run[-1][0]+1)*3])
                faces = [f for i,f in enumerate(faces) if keep[i]]
        if key == "gen7" and name == "paint":
            def original_brow(face):
                xyz = [vertices[i] for i in face]
                return (any(abs(y-.615)<.00002 for x,y,z in xyz) and max(p[1] for p in xyz)>.64
                        and all(y>=.61499 and abs(z-(2.273-.245*(abs(x)/1.025)**4))<.0031 for x,y,z in xyz))
            base_ranges[name] = []
            for keep, group in groupby(enumerate(faces),lambda item: not original_brow(item[1])):
                run = list(group)
                if keep:
                    base_ranges[name].append([run[0][0]*3,(run[-1][0]+1)*3])
            faces = [f for i,f in enumerate(faces) if not original_brow(f)]
        if not faces:
            continue
        obj = object_mesh(name, vertices, faces, name)
        obj.data.validate()
        for face in obj.data.polygons:
            face.use_smooth = True
        if name in ("paint","trim","headlight","taillight"):
            start = len(points)
            triangles.extend([start + i for i in face] for face in faces)
            points.extend(vertices)
    wheel = model["wheel"]
    hub = wheel_finish(True) if key == "grassroots" else {"position":[], "color":[], "index":[], "normal":[]}
    wheel_base = len(wheel["position"]) // 3
    wheel_object = object_mesh("Wheel", triples(wheel["position"] + hub["position"]),
                               triples(wheel["index"] + [wheel_base + i for i in hub["index"]]), "wheel")
    wheel_colors = wheel_object.data.color_attributes.new(name="Wheel finish", type="FLOAT_COLOR", domain="POINT")
    wheel_colors.data.foreach_set("color", [c for rgb in triples(wheel["color"] + hub["color"]) for c in (*rgb, 1)])
    for i, pos in enumerate(model["wheelPositions"]):
        instance = wheel_object if i == 0 else wheel_object.copy()
        if i:
            collection.objects.link(instance)
        instance.location = Vector(blender_point(pos)) + Vector((offset, 0, 0))
    bumper = BVHTree.FromPolygons(points, triangles, all_triangles=True)
    details = {}
    if key == "grassroots":
        shape_sc01()
        grassroots_nose.build(add_grid)
        skin = details["paint"]
        bumper = BVHTree.FromPolygons(triples(skin["position"]), triples(skin["index"]), all_triangles=True)
        grassroots_nose.lamps(fascia)
        for material, ranges in base_ranges.items():
            details[material]["baseIndexRanges"] = ranges
        details["wheel"] = hub
        roof_and_pillars()
        payload["grassrootsRoofDecal"] = roof_overlay(.51,-.73,.30)
        payload["grassrootsTeamBand"] = roof_overlay(.73,.275,.395)
    else:
        shape_gen7()
        gen7_brow(model["parts"]["paint"])
        details["paint"]["baseIndexRanges"] = base_ranges["paint"]
    payload[key] = details
    if key == "gen7":
        payload["premierSponsor"] = side_sponsor()
        collection.name = "Challenger • Empire Gen-7"
        challenger = collection
        base_objects = list(challenger.objects)
        display_numbers(False, False)
        collection = bpy.data.collections.new("Premier • Empire Gen-7")
        scene.collection.children.link(collection)
        offset += 3.30
        for obj in base_objects:
            duplicate = obj.copy()
            duplicate.location.x += 3.30
            collection.objects.link(duplicate)
        display_numbers(True, False)
        hood_source = (OUT / "hood-logo-meshes.js").read_text(encoding="utf8")
        hood = json.loads(hood_source[hood_source.index("{"):hood_source.rindex("}")+1])["gen7"]
        side = payload["premierSponsor"]
        display_sponsor({"position": hood["position"] + side["position"], "uv": hood["uv"] + side["uv"],
                         "index": hood["index"] + [len(hood["position"])//3 + i for i in side["index"]]})
    else:
        collection.name = "Grassroots • Empire SC-01"
        display_numbers(False, True)

for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        view = area.spaces.active
        view.overlay.show_overlays = False
        view.shading.type = "MATERIAL"
        view.shading.color_type = "MATERIAL"
        view.region_3d.view_distance = 14
        view.region_3d.view_location = (1.65, 0, .5)
        view.region_3d.view_rotation = Vector((-4, 8, -4)).to_track_quat("-Z", "Y")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "empire-body-finishes.blend"), compress=True)
(OUT / "body-finishes.js").write_text(
    "// Generated by tools/build_car_finish.py.\nconst SC_BODY_FINISHES = " +
    json.dumps(payload, separators=(",", ":")) + ";\n", encoding="utf8")
print("Body detail triangles:", {key: sum(len(m["index"]) // 3 for m in payload[key].values())
                                 for key in ("grassroots", "gen7")})

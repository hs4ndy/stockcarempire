"""Build the editable SC-01/Gen-7 finish details and the matching game buffers.

Run in background Blender with --python tools/build_car_finish.py. Coordinates
in the modeling helpers are game coordinates (Y up, +Z towards the nose).
"""
import json
import math
from itertools import groupby
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


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
    vertices = [p for row in rows for p in row]
    faces = []
    for j in range(0, len(vertices) - 2, 2):
        faces.extend([(j, j + 1, j + 2), (j + 2, j + 1, j + 3)])
    obj = object_mesh(name, vertices, faces, material)
    bucket = details.setdefault(material, {"position": [], "normal": [], "index": []})
    start = len(bucket["position"]) // 3
    for point, vertex in zip(vertices, obj.data.vertices):
        normal = vertex.normal
        bucket["position"].extend(round(v, 5) for v in point)
        bucket["normal"].extend(round(v, 5) for v in (normal.x, normal.z, -normal.y))
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
    for side in (-1, 1):
        # Close the narrow opening between the swept pillar and curved glass.
        add_detail("Windshield side reveal", "trim", [
            [(side*.676,1.222,.423),(side*.716,1.183,.432)],
            [(side*.784,1.036,.687),(side*.837,1.011,.690)],
            [(side*.886,.845,.942),(side*.907,.845,.940)],
        ])
        add_detail("Upper A-pillar return", "paint", [
            [(side*.706,1.196,.31),(side*.747,1.182,.31)],
            [(side*.680,1.220,.421),(side*.715,1.184,.435)],
        ])
        fascia("Smoked headlamp pocket", "trim",
               [(.47,.525,.563),(.62,.527,.577),(.74,.542,.594),
                (.84,.553,.610),(.93,.575,.619)], 1, side, .009)
        fascia("Swept reflector blade", "metal",
               [(.50,.548,.551),(.64,.554,.566),(.76,.570,.583),
                (.84,.583,.596),(.91,.598,.604)], 1, side, .013)
        for x in (.74, .80):
            fascia("Lower projector facet", "metal",
                   [(x,.549+(x-.74)*.17,.555+(x-.74)*.17),
                    (x+.042,.558+(x-.74)*.17,.568+(x-.74)*.17)], 1, side, .013)
        for y in (.24, .30, .36):
            fascia("Brake duct louver", "metal",
                   [(.824,y,y+.010),(.908,y+.012,y+.019)], 1, side, .009)
        # Floating dark cuts subdivide the existing continuous red tail lamps.
        for x in (.61, .70, .775):
            fascia("Tail lens separation", "trim",
                   [(x,.623,.662),(x+.012,.624,.663)], -1, side, .012)
    for y, width in ((.24,.61),(.31,.56)):
        fascia("Radiator cross slat", "metal",
               [(-width,y,y+.009),(0,y,y+.009),(width,y,y+.009)], 1, 1, .015)


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
        fascia("Recessed segmented lamp", "trim",
               [(.55,.555,.597),(.70,.548,.597),(.838,.540,.588)], 1, side, .006)
        for x in (.566,.700):
            fascia("Prismatic reflector", "metal",
                   [(x,.558,.584),(x+.072,.553,.585),(x+.104,.560,.585)], 1, side, .010)
        fascia("Upper lens strip", "headlight",
               [(.545,.596,.606),(.695,.595,.605),(.85,.587,.598)], 1, side, .010)
        fascia("Recessed cooling duct", "trim",
               [(.63,.244,.308),(.80,.240,.342),(.87,.261,.329)], 1, side, .005)
        fascia("Duct lower lip", "metal",
               [(.65,.248,.254),(.80,.246,.255),(.856,.262,.266)], 1, side, .009)
        for x in (.45,.62,.79):
            fascia("Tail lens upper bevel", "taillight",
                   [(x-.049,.609,.619),(x+.049,.611,.622)], -1, side, .004)


def side_sponsor():
    # The same UV rectangle reads left-to-right from either side. Sample the
    # shell at its crease so the artwork sits flush across the lower door.
    packet = {"position": [], "uv": [], "index": []}
    for side in (-1, 1):
        start = len(packet["position"]) // 3
        for y in (.345, .57, .785):
            for u in (0, .5, 1):
                z = -.45 + (.5 - u) * side * .80
                hit, _, _, _ = bumper.ray_cast((2 * side,y,z), (-side,0,0))
                if hit is None:
                    raise ValueError("Missing Premier side panel")
                packet["position"].extend((round(hit.x + side * .005,5), y, round(z,5)))
                packet["uv"].extend((u, round((y - .345) / .44,5)))
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
        curve.size = .52 if grassroots else .50
        obj = bpy.data.objects.new("Door number", curve)
        collection.objects.link(obj)
        obj.location = (offset + side * (1.045 if grassroots else 1.026),
                        -.50 if premier else -.04, .58 if grassroots else .55)
        obj.rotation_euler = (math.pi / 2, 0, side * math.pi / 2)
        curve.materials.append(materials["accent"])


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
    keep_ranges = []
    for name, part in model["parts"].items():
        vertices, faces = triples(part["position"]), triples(part["index"])
        if key == "grassroots" and name == "paint":
            # Long contiguous runs identify the four tubular arch meshes in
            # the baked paint batch. Short matches belong to the shell itself.
            def on_lip(index):
                x,y,z = vertices[index]
                r = math.hypot(abs(z) - 1.42, y - .40)
                return 1.0648 < abs(x) < 1.0912 and y >= .385 and abs(r - .465) < .014

            cursor = 0
            for match, group in groupby(enumerate(faces), lambda f: all(on_lip(i) for i in f[1])):
                run = list(group)
                if match and len(run) >= 280:
                    keep_ranges.append([cursor, run[0][0] * 3])
                    cursor = (run[-1][0] + 1) * 3
            if len(keep_ranges) != 2:
                raise ValueError("SC-01 paint topology changed; inspect the arch selection")
            keep_ranges.append([cursor, len(part["index"])])
            faces = [face for a,b in keep_ranges for face in faces[a//3:b//3]]
        obj = object_mesh(name, vertices, faces, name)
        obj.data.validate()
        for face in obj.data.polygons:
            face.use_smooth = True
        if name in ("paint","trim","headlight","taillight"):
            start = len(points)
            triangles.extend([start + i for i in face] for face in faces)
            points.extend(vertices)
    wheel = model["wheel"]
    hub = wheel_finish(key == "grassroots")
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
    (shape_sc01 if key == "grassroots" else shape_gen7)()
    if keep_ranges:
        details["paint"]["baseIndexRanges"] = keep_ranges
    payload[key] = details
    details["wheel"] = hub
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

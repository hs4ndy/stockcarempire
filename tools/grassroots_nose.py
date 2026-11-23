"""SC-01 front clip. Coordinates follow the game: Y up, +Z forward."""
from math import cos, pi, sin, sqrt
from collections import defaultdict
from mathutils import Vector


def interpolate(x, knots):
    for (a, left), (b, right) in zip(knots, knots[1:]):
        if x <= b:
            return left + (right - left) * max(0, (x - a) / (b - a))
    return knots[-1][1]


def arch(z):
    delta = abs(z - 1.42)
    return .40 + sqrt(max(0, .46**2 - delta**2)) if delta <= .460001 else .19


def width(z):
    return interpolate(z, [(0,1.02),(1.42,1.075),(2.04,1.0414),(2.24,1.025),(2.46,.982)])


def hood(t, z):
    """Center slopes independently of the wheel crowns. First ring fits the old cowl."""
    u = (z - .90) / 1.56
    center = .90595 - .127 * u - .166 * u**2
    old_profile = interpolate(abs(t), [(0,0),(.78,-.017),(.94,-.042),(1,-.082)])
    shoulder = max(0, arch(z) + .102 - center)
    height = center + old_profile * (1 - .54*u) + shoulder * abs(t)**3
    bend = .265 * max(0, (z - 1.95) / .51)**1.5 * abs(t)**3
    return (t * width(z), height, z - bend)


def face(t, y, inset=0):
    x, top, z = hood(t, 2.46)
    h = max(0, min(1, (y-.17)/(top-.17)))
    return (x, y, z + (.036*sin(pi*h) - .019*(1-h)**3) * (1-abs(t)**4) + inset)


def build(emit):
    """Emit indexed grids so the hood and front bumper shade as continuous surfaces."""
    stations = sorted({.90,.955,1.90,2.04,2.16,2.28,2.37,2.43,2.46} |
                      {round(1.42+.46*cos(i*pi/20),6) for i in range(21)})
    half = [0,.30,.52,.65,.70,.76,.78,.86,.94,.97,1]
    across = [-v for v in reversed(half[1:])] + half
    skin = []
    # End row on the existing cowl. New vertices on that edge interpolate along its faces.
    rows = [[hood(t,z) for t in across] for z in stations]
    skin.append(("Sloping hood and fender crowns",rows,True))
    for side in (-1,1):
        wall = []
        for z in stations:
            x, y, tip = hood(side,z)
            low = arch(z) if z <= 1.89 else interpolate(z, [(1.89,.19),(2.46,.17)])
            wall.append([(x,low,tip),(x,y,tip)])
        skin.append(("Front fender side",wall,side < 0))
        stripes = []
        for z in sorted({.99,2.38} | {s for s in stations if .99<s<2.38}):
            row = []
            for x in (.11,.27):
                px,py,pz = hood(side*x/width(z),z)
                row.append((px,py+.0035,pz))
            stripes.append(row)
        emit("Hood racing stripe", "accent", stripes, reverse=side > 0)

    # Opening boundary is shared by the painted skin and the four recessed returns.
    columns = across
    def opening(t, upper):
        s = abs(t)
        x = t * (interpolate(s,[(0,.94),(.70,.94),(1,1)]) if upper else
                 interpolate(s,[(0,.84),(.70,.84),(1,1)]))
        y = (.432-.033*min(s/.70,1)**4 if upper else .226+.018*min(s/.70,1)**4)
        return face(x, y)
    bottom = [face(t,.17) for t in columns]
    lower = [opening(t,False) for t in columns]
    upper = [opening(t,True) for t in columns]
    brow = [face(t,.485) for t in columns]
    crest = [hood(t,2.46) for t in columns]
    shoulder = [face(t,hood(t,2.46)[1]-.037) for t in columns]
    skin.append(("Rolled bumper chin",[bottom,lower],False))
    skin.append(("Upper bumper",[upper,brow,shoulder,crest],False))
    start, stop = columns.index(-.70), columns.index(.70)+1
    skin.append(("Left bumper cheek",[lower[:start+1],upper[:start+1]],False))
    skin.append(("Right bumper cheek",[lower[stop-1:],upper[stop-1:]],False))
    # Smooth the welded edges of the painted clip while keeping the grille
    # and lamp graphics separate. Area-independent normals avoid a dark edge
    # where a tall side panel meets the closely spaced brow sections.
    normals = defaultdict(lambda: Vector((0,0,0)))
    for _,grid,reverse in skin:
        for a,b in zip(grid,grid[1:]):
            for i in range(len(a)-1):
                n = (Vector(a[i+1])-Vector(a[i])).cross(Vector(b[i])-Vector(a[i])).normalized()
                for point in (a[i],a[i+1],b[i],b[i+1]):
                    normals[point] += -n if reverse else n
    for name,grid,reverse in skin:
        emit(name,"paint",grid,reverse=reverse,shading=[normals[p].normalized() for row in grid for p in row])
    low, high = lower[start:stop], upper[start:stop]
    def inner(p):
        x,y,z = p
        return (x*.978,.33+(y-.33)*.89,z-.038)
    il, ih = [inner(p) for p in low], [inner(p) for p in high]
    emit("Radiator opening", "trim", [il,ih])
    for a,b in [(low,il),(ih,high),([low[0],high[0]],[il[0],ih[0]]),
                ([il[-1],ih[-1]],[low[-1],high[-1]])]:
        emit("Intake return","trim",[a,b])
    # A single shallow vane catches a grazing highlight inside the aperture.
    emit("Radiator vane","trim",[[(p[0],.313,p[2]-.012) for p in low],
                                 [(p[0],.325,p[2]-.020) for p in low]])
    edge = [(-width(2.04),.187,2.04), *bottom, (width(2.04),.187,2.04)]
    lip = [(x*1.018,y-.013,z+.026*(1-abs(x/1.05)**2)) for x,y,z in edge]
    emit("Molded valance edge","trim",[edge,lip,[(x*.998,y-.013,z-.003) for x,y,z in lip]])
    emit("Undertray","trim",[[(-w,.135,z),(w,.135,z)] for w,z in
                             [(.92,-2.28),(.92,1.99),(.91,2.18),(.65,2.35)]])


def lamps(project):
    # Original single-lens graphic with a graphite border tapered at both ends.
    # Sample the finished skin so the lamp wraps around the shoulder.
    for side in (-1,1):
        stations = [(.445,.487,.512),(.49,.469,.538),(.63,.472,.553),(.74,.482,.565),
                    (.84,.494,.564),(.92,.511,.560),(.955,.530,.552)]
        project("Flush lens surround","trim",stations,1,side,.0028)
        project("Lamp reflector","metal",[(.475,.484,.492),(.54,.481,.510),(.66,.486,.525),
                (.76,.498,.536),(.86,.517,.541),(.932,.540,.546)],1,side,.0047)
        project("Lens upper edge","headlight",[(.51,.513,.519),(.63,.527,.536),(.74,.539,.548),
                (.84,.545,.552),(.925,.546,.550)],1,side,.0055)

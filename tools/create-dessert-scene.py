import bpy, math, random
from mathutils import Vector

random.seed(24)
scene = bpy.context.scene
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)

def material(name, color, roughness, metallic=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    return m

crumb = material('Chocolate sponge — baked crumb', (.12,.035,.012), .88)
cream = material('Vanilla cream', (.87,.62,.27), .49)
ganache = material('Chocolate glaze', (.055,.012,.005), .24)
berry = material('Blueberry bloom', (.025,.032,.083), .42)
seed = material('Strawberry seeds', (.57,.29,.08), .55)
leaf = material('Fresh green leaves', (.042,.12,.016), .66)
strawberry = material('Strawberry skin', (.63,.025,.008), .29)
cutfruit = material('Strawberry cut flesh', (.89,.12,.049), .55)

# Embedded portable image texture. Fine pores and irregular crumbs remain visible
# in the GLB without depending on Blender procedural nodes.
img = bpy.data.images.new('Chocolate crumb texture', width=512, height=512)
pixels=[]
for y in range(512):
    for x in range(512):
        n=random.random()
        v=.25+.55*n
        if n < .12: v *= .35
        if n > .9: v *= 1.45
        pixels.extend((.30*v,.105*v,.040*v,1))
img.pixels.foreach_set(pixels)
img.pack()
nodes=crumb.node_tree.nodes
tex=nodes.new('ShaderNodeTexImage');tex.image=img
crumb.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])

def mesh(name, verts, faces, mat, parent=None, smooth=False):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o)
    o.data.materials.append(mat)
    if parent: o.parent=parent
    for p in data.polygons: p.use_smooth=smooth
    # Metre-space box UVs give the cake cuts the same dense crumb grain.
    uv=data.uv_layers.new(name='DessertUV')
    for p in data.polygons:
        normal=p.normal
        axis=max(range(3),key=lambda a:abs(normal[a]))
        axes=[a for a in range(3) if a!=axis]
        for li in p.loop_indices:
            co=data.vertices[data.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]*12,co[axes[1]]*12)
    return o

def empty(name):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);return o

cake=empty('Cake');piece=empty('Slice')
start=-math.pi/2+.43; end=-math.pi/2+math.tau-.43

def sector(name,a,b,z,h,mat,parent,r=.19,steps=160):
    angles=[a+(b-a)*i/steps for i in range(steps+1)]
    verts=[(0,0,z),(0,0,z+h)]
    for t in angles:
        # A gently irregular silhouette gives the baked layers natural edges.
        rr=r*(1+.005*math.sin(37*t)+.003*math.sin(83*t))
        verts.extend(((rr*math.cos(t),rr*math.sin(t),z), (rr*math.cos(t),rr*math.sin(t),z+h)))
    faces=[]
    for i in range(steps):
        j=2+2*i;k=j+2
        faces.extend(((j,k,k+1,j+1),(0,k,j),(1,j+1,k+1)))
    faces.extend(((0,2,3,1),(0,1,len(verts)-1,len(verts)-2)))
    o=mesh(name,verts,faces,mat,parent)
    bevel=o.modifiers.new('Soft baked edges','BEVEL');bevel.width=.0015;bevel.segments=2
    return o

for parent,a,b in [(cake,start,end),(piece,-math.pi/2-.43,-math.pi/2+.43)]:
    prefix=parent.name
    sector(prefix+' bottom sponge',a,b,.0,.063,crumb,parent)
    sector(prefix+' vanilla centre',a,b,.063,.021,cream,parent,r=.191)
    sector(prefix+' upper sponge',a,b,.084,.063,crumb,parent)
    sector(prefix+' glossy chocolate top',a,b,.147,.007,ganache,parent,r=.193)
    # Continuous scalloped ganache skirt with round drips of different lengths.
    steps=200;verts=[];faces=[]
    for i in range(steps+1):
        t=a+(b-a)*i/steps
        drip=.004+.020*(.5+.5*math.sin(t*15+.8))**9+.009*(.5+.5*math.sin(t*23))**12
        rr=.193
        verts.extend(((rr*math.cos(t),rr*math.sin(t),.152),(rr*math.cos(t),rr*math.sin(t),.146-drip)))
    for i in range(steps):faces.append((2*i,2*i+2,2*i+3,2*i+1))
    mesh(prefix+' flowing ganache',verts,faces,ganache,parent,smooth=True)

def sphere(name,loc,scale,mat,parent,segments=24,rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=(0,0,0))
    o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def strawberry_half(name,loc,angle,parent):
    group=empty(name);group.parent=parent;group.location=loc;group.rotation_euler=(.12,.10,angle)
    # Half fruit: rounded outer skin and a broad visible cut face.
    verts=[];faces=[];rings=18;steps=24
    for j in range(rings+1):
        z=j/rings
        radius=.022*math.sin(math.pi*(.16+.84*z))*(.65+.35*(1-z))
        for i in range(steps+1):
            t=math.pi*i/steps
            verts.append((radius*math.cos(t),radius*.72*math.sin(t),.042*z))
    for j in range(rings):
        for i in range(steps):
            q=j*(steps+1)+i;faces.append((q,q+1,q+steps+2,q+steps+1))
    mesh(name+' skin',verts,faces,strawberry,group,True)
    boundary=[verts[j*(steps+1)] for j in range(rings+1)]
    boundary+=list(reversed([verts[j*(steps+1)+steps] for j in range(rings+1)]))
    mesh(name+' cut face',boundary,[tuple(range(len(boundary)))],cutfruit,group)
    # A pale central core and fine golden seeds make the silhouette legible.
    sphere(name+' pale core',(0,-.0008,.020),(.007,.001,.013),cream,group,16,12)
    for j in range(6):
        z=(j+.65)/7
        rad=.022*math.sin(math.pi*(.16+.84*z))*(.65+.35*(1-z))
        for i in range(7):
            t=(i+.6)/8*math.pi
            sphere(name+' seed',((rad+.0003)*math.cos(t),(rad*.72+.0004)*math.sin(t),.042*z),(.0009,.0007,.00135),seed,group,8,6)
    return group

for i,t in enumerate([-.30,.5,1.35,2.2,3.05,3.9,4.55]):
    parent=cake if not (start>t%(math.tau)>end) else cake
    x=.137*math.cos(t);y=.137*math.sin(t)
    if y<-.12 and abs(x)<.065:continue
    strawberry_half('Strawberry '+str(i),(x,y,.153),t-.9,parent)
    bt=t+.35
    bx=.139*math.cos(bt);by=.139*math.sin(bt)
    sphere('Blueberry '+str(i),(bx,by,.172),(.018,.018,.018),berry,parent)
    # Blueberry crown, a five-point bloom visible above the berry.
    for j in range(5):
        a=j*math.tau/5
        sphere('Blueberry crown', (bx+.006*math.cos(a),by+.006*math.sin(a),.189),(.003,.003,.002),berry,parent,12,8)
strawberry_half('Slice strawberry',(.008,-.133,.153),.8,piece)
sphere('Slice blueberry',(-.033,-.133,.172),(.018,.018,.018),berry,piece)
piece.location=(.035,-.054,.014);piece.rotation_euler=(0,.08,-.10)

# A small number of chocolate crumbs add depth beside the independent slice.
crumbs=empty('Crumbs')
for i in range(12):
    o=sphere('Chocolate crumb '+str(i),(.20+random.random()*.035,-.06+random.random()*.16,.035+random.random()*.14),(.003,.003,.003),crumb,crumbs,8,6)

def light(name,kind,loc,energy,color,size=0):
    data=bpy.data.lights.new(name,kind);data.energy=energy;data.color=color
    if kind=='POINT':data.shadow_soft_size=size
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc
    return o
light('Key softbox','POINT',(-.5,-.5,.65),38,(1,.86,.69),.3)
light('Fill softbox','POINT',(.5,-.3,.35),15,(.79,.86,1),.2)
light('Chocolate rim','POINT',(.1,.4,.6),45,(1,.79,.56),.2)
scene.world=bpy.data.worlds.new('Studio ambience');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.19,.13,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.object.camera_add(location=(.34,-.64,.41))
cam=bpy.context.object;cam.name='Delivery camera';cam.rotation_euler=(Vector((0,-.012,.10))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.62;scene.camera=cam
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG'
target=artifacts.file(name='yemape-dessert-preview.png',media_type='image/png');scene.render.filepath=target.path
bpy.ops.render.render(write_still=True);target.publish()
result={'objects':len(bpy.data.objects),'triangles':sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'),'parts':['Cake','Slice','Crumbs'],'dimensions_m':[.46,.46,.20]}

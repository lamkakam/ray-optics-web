# Optimizer Example

The following snippet demonstrates how to optimize a rayoptics optical system. 

```python
isdark = True

from rayoptics.environment import *
from scipy.optimize import least_squares

def define_optics(n):
    opm = OpticalModel()
    sm  = opm.seq_model
    osp = opm.optical_spec
    pm = opm.parax_model
    
    osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=0.0, flds=[0.], is_relative=True) 
    osp['wvls'].wavelengths = [850.0]
    
    opm.radius_mode = True
    #### parameters
    # NA lens
    NA = 0.2 
    # Diameter
    D = 10
    # focal
    f = (D/2-0.6875)/NA
    # curvature radius
    R = (n-1)*f 
    # min thickness lenses
    t = R-(R**2-(D/2)**2)**(1/2) 
    # shift principal plan
    spp = -t*f/R*(n-1)/n
    
    ## Value of the pupil set for 1 fiber output
    osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=(f+spp)*NA*2)
    # add this to not override entered semi-diameters.
    sm.do_apertures = False
    
    # waveguide interface
    # sm.gaps[0].thi=f+spp
    sm.gaps[0].thi=1e13
    # pupil (to control pupil diameter)
    opm.add_dummy_plane(sd=(f+spp)*NA)
    sm.set_stop()
    # lens
    sm.add_surface([R,t,n],sd=D/2-1e-5)
    sm.add_surface([0,f+spp],sd=D/2-1e-5)
    
    opm.update_model()
    
    return opm, sm, osp, pm

def optimize(order: int):
    # solve for aspheric coefficients to minimize ray fan errors
    initial_guess = [0] * order
    
    from functools import partial
    objective_waddparam = partial(evaluate_model, opm=opm, sm=sm)
    # Optimisation
    result = least_squares(objective_waddparam, initial_guess, method='lm', xtol=1e-14, gtol=1e-12)
    # set opm to the solution
    evaluate_model(result.x, opm, sm)
    print("Best coefficients :", result.x)
    return result

def ssq_function(opm):
    # get the aberration levels
    ray_fan = RayFanFigure(opt_model=opm, data_type='Ray')
    ray_fan.update_data()
    y_values = ray_fan.axis_data_array[0][0][1][0]
    
    return y_values

def evaluate_model(coeffs, opm, sm):
    # change profile with coefficients
    coeffs = np.concatenate((np.array([0.]), coeffs));
    s2 = sm.ifcs[2]
    s2.profile = EvenPolynomial(r=s2.profile.r,cc=0,coefs=coeffs)
    opm.update_model()
    abr_vec = ssq_function(opm)
    return abr_vec

def sumsq(y_values):
    return np.sum(np.square(y_values))


n = 1.4512 # Silica
opm, sm, osp, pm = define_optics(n)

layout_plt = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,
                        do_draw_ray_fans=True,
                        # clip_rays=True, 
                        do_draw_beams=False, 
                        do_draw_edge_rays=False,
                        do_paraxial_layout=False).plot()

result2 = optimize(2)

layout_plt2 = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,
                        do_draw_ray_fans=True,
                        # clip_rays=True, 
                        do_draw_beams=False, 
                        do_draw_edge_rays=False,
                        do_paraxial_layout=False).plot()

```
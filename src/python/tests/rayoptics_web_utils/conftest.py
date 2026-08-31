"""Shared fixtures for rayoptics_web_utils tests."""

import pytest
from rayoptics.raytr.vigcalc import set_vig


@pytest.fixture(scope="session", autouse=True)
def setup_env():
    """Run init() once for the entire test session."""
    from rayoptics_web_utils.env import init
    init()


@pytest.fixture(scope="session")
def cooke_triplet():
    """Build a configured Cooke Triplet optical model (session-scoped, read-only)."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec

    opm = OpticalModel()
    osp = opm['optical_spec']
    sm = opm['seq_model']
    opm.system_spec.dimensions = 'mm'
    osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=12.5)
    osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=20, flds=[0, 0.707, 1], is_relative=True)
    osp['wvls'] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 10000000000
    sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"], sd=10.009)
    sm.add_surface([7331.288, 5.86, "air"], sd=8.9482)
    sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"], sd=4.7919)
    sm.set_stop()
    sm.add_surface([21.896, 4.822, "air"], sd=4.7761)
    sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"], sd=8.0217)
    sm.add_surface([-20.4942, 41.2365, "air"], sd=8.3321)
    sm.ifcs[-1].profile.r = 0
    opm.update_model()
    return opm


@pytest.fixture
def dispersive_image_space_model():
    """Build a finite Cooke model with dispersive image-space glass."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec

    opm = OpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=8.0)
    osp["fov"] = FieldSpec(
        osp,
        key=["object", "height"],
        value=0.2,
        flds=[0.0, 1.0],
        is_relative=True,
    )
    osp["wvls"] = WvlSpec(
        [(486.133, 1.0), (587.562, 2.0), (656.273, 1.0)],
        ref_wl=1,
    )
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 120.0
    sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"], sd=100.0)
    sm.add_surface([7331.288, 5.86, "air"], sd=100.0)
    sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"], sd=100.0)
    sm.set_stop()
    sm.add_surface([21.896, 4.822, "air"], sd=100.0)
    sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"], sd=100.0)
    sm.add_surface(
        [-20.4942, 41.2365, "N-BK7", "Schott"],
        sd=100.0,
    )
    sm.ifcs[-1].profile.r = 0.0
    opm.update_model()
    return opm


@pytest.fixture
def sasian_triplet_autoaperture():
    """Build the Sasian Triplet model with the app's auto-aperture defaults."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec
    from rayoptics.seq.medium import decode_medium

    opm = OpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=12.5)
    osp["fov"] = FieldSpec(osp, key=["object", "angle"], value=20, flds=[0, 0.707, 1], is_relative=True)
    osp["wvls"] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)
    opm.radius_mode = True
    sm.do_apertures = True
    sm.gaps[0].thi = 10000000000
    sm.gaps[0].medium = decode_medium("air")
    sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"], sd=10.009)
    sm.add_surface([7331.288, 5.86, "air"], sd=8.9482)
    sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"], sd=4.7919)
    sm.set_stop()
    sm.add_surface([21.896, 4.822, "air"], sd=4.7761)
    sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"], sd=8.0217)
    sm.add_surface([-20.4942, 41.2365, "air"], sd=8.3321)
    sm.ifcs[-1].profile.r = 0
    opm.update_model()
    set_vig(opm)
    return opm


@pytest.fixture(scope="session")
def quad_schiefspiegler_autoaperture():
    """Build the app's Quad-Schiefspiegler example, including its dummy surface."""
    from rayoptics.elem.profiles import EvenPolynomial
    from rayoptics.elem.surface import Circular, DecenterData
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec
    from rayoptics.seq.medium import decode_medium
    from rayoptics_web_utils.aperture import set_vig_with_ronchi_envelopes

    opm = OpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=318)
    osp["fov"] = FieldSpec(
        osp,
        key=["object", "angle"],
        value=0.125,
        flds=[0, 0.5, 1],
        is_relative=True,
    )
    osp["wvls"] = WvlSpec(
        [
            (435.835, 0.035),
            (486.133, 0.18),
            (546.073, 0.98),
            (656.273, 0.075),
            (706.519, 0.0028),
        ],
        ref_wl=2,
    )
    opm.radius_mode = True
    sm.do_apertures = True
    sm.gaps[0].thi = 1e10
    sm.gaps[0].medium = decode_medium("air")

    sm.add_surface([0, 0, "air"])
    sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=159)]
    sm.add_surface([-7620, -2172, "REFL"])
    sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=159)]
    sm.set_stop()
    sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=-7620, cc=-0.55)
    sm.ifcs[sm.cur_surface].decenter = DecenterData("bend", alpha=-3.15)

    sm.add_surface([-7620, 1700, "REFL"])
    sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=73.096057)]
    sm.ifcs[sm.cur_surface].decenter = DecenterData("bend", alpha=9.6)

    sm.add_surface([-53238, -1122.4, "REFL"])
    sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=38.475044)]
    sm.ifcs[sm.cur_surface].decenter = DecenterData("bend", alpha=38.55)
    sm.ifcs[-1].profile.r = 0
    sm.ifcs[-1].decenter = DecenterData("decenter", alpha=-9.15)

    opm.update_model()
    set_vig_with_ronchi_envelopes(opm)
    return opm


@pytest.fixture(scope="session")
def tilted_houghton():
    """Build the Tilted Houghton-Herschel 150mm f/8 example system."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec
    from rayoptics.elem.surface import DecenterData

    opm = OpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=150)
    osp["fov"] = FieldSpec(
        osp, key=["object", "angle"], value=-0.5,
        flds=[0, 0.707, 1], is_relative=True,
    )
    osp["wvls"] = WvlSpec(
        [
            (435.835, 0.035),
            (486.133, 0.18),
            (546.073, 0.98),
            (656.273, 0.075),
            (706.519, 0.0028),
        ],
        ref_wl=2,
    )
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 1e10

    sm.add_surface([2022, 11.2, "N-BK7", "Schott"], sd=75)
    sm.set_stop()
    sm.add_surface([0, 10.5, "air"], sd=74.922466)

    dec_s3 = DecenterData("dec and return")
    dec_s3.euler[0] = 5.4
    dec_s3.update()
    sm.add_surface([-2022, 9.9, "N-BK7", "Schott"], sd=74.812074)
    sm.ifcs[sm.cur_surface].decenter = dec_s3

    dec_s4 = DecenterData("dec and return")
    dec_s4.euler[0] = 5.4
    dec_s4.dec[1] = 1.5
    dec_s4.update()
    sm.add_surface([0, 1140, "air"], sd=74.868647)
    sm.ifcs[sm.cur_surface].decenter = dec_s4

    dec_s5 = DecenterData("bend")
    dec_s5.euler[0] = 3.0
    dec_s5.update()
    sm.add_surface([-2404.5, -1050, "REFL"], sd=84.762317)
    sm.ifcs[sm.cur_surface].decenter = dec_s5

    dec_s6 = DecenterData("bend")
    dec_s6.euler[0] = -48.0
    dec_s6.update()
    sm.add_surface([0, 153.195342, "REFL"], sd=19.846683)
    sm.ifcs[sm.cur_surface].decenter = dec_s6

    dec_img = DecenterData("bend")
    dec_img.euler[0] = 5.66
    dec_img.update()
    sm.ifcs[-1].profile.cv = 1.0 / 2600.0
    sm.ifcs[-1].decenter = dec_img

    opm.update_model()
    return opm


@pytest.fixture
def afocal_two_lens():
    """Build a paraxially afocal pair of identical zero-thickness thin lenses."""
    from rayoptics.environment import OpticalModel
    from rayoptics.raytr.opticalspec import PupilSpec, FieldSpec, WvlSpec

    opm = OpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    opm.system_spec.dimensions = "mm"
    osp["pupil"] = PupilSpec(osp, key=["object", "epd"], value=10.0)
    osp["fov"] = FieldSpec(
        osp, key=["object", "angle"], value=1.0,
        flds=[0.0, 1.0], is_relative=True,
    )
    osp["wvls"] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 1.0e10

    # Each zero-thickness n=1.5 biconvex lens has paraxial power 1/100 mm.
    # Separating equal positive lenses by f1 + f2 gives an exact afocal pair.
    sm.add_surface([100.0, 0.0, 1.5], sd=6.0)
    sm.set_stop()
    sm.add_surface([-100.0, 200.0, "air"], sd=6.0)
    sm.add_surface([100.0, 0.0, 1.5], sd=6.0)
    sm.add_surface([-100.0, 1.0e10, "air"], sd=6.0)
    opm.update_model()
    return opm

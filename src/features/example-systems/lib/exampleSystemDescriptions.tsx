import type { ComponentProps, ReactNode } from 'react';
import { MathJax } from 'better-react-mathjax';
import { ExternalLink, Paragraph } from '@/shared/components/primitives';

const DescriptionParagraph = ({ children }: { children: ReactNode }) => (
  <Paragraph variant="description">
    {children}
  </Paragraph>
);

const DescriptionExternalLink = (props: ComponentProps<typeof ExternalLink>) => (
  <ExternalLink {...props} variant="description" />
);

const DESCRIPTIONS_BY_NAME: Record<string, ReactNode> = {
  "Sasian Triplet": (
    <>
      <DescriptionParagraph>
        An f/4 Cooke Triplet lens with a 50 mm focal length and a field of view of ±20 degrees. 
        The design is the lens prescription from 
        Professor José Sasián’s OPTI 517 Lens Design course at the University of Arizona. 
        It provides a useful educational example for studying classical photographic lens forms, 
        aberration correction, and multi-element lens design.
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://web.archive.org/web/20180219044422/http://wp.optics.arizona.edu/jsasian/wp-content/uploads/sites/33/2016/03/L4_OPTI_517_Aberration_Coefficients.pdf"
        aria-label="Web archive link to the original Lecture 4 course material, which includes the lens prescription and aberration coefficient data for this design."
      >
        Web Archive link to the original Lecture 4 course material, which includes the lens prescription and aberration coefficient data for this design.
      </DescriptionExternalLink>
    </>
  ),

  "Newtonian Reflector with Optical Window": (
    <>
      <DescriptionParagraph>
        An f/5 Newtonian reflector with a 200 mm aperture.
        It uses a parabolic primary reflector to form the image, 
        together with a flat secondary mirror to redirect the optical path.
        A thin, flat optical window is also included in the system, 
        primarily serving as a sealing element while introducing minimal optical power.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/reflecting.htm"
        aria-label="Chapter 8.1 of telescope-optics.net"
      >
        Chapter 8.1 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  
  "Herschel's 40-foot Reflector": (
    <>
      <DescriptionParagraph>
        William Herschel’s reflector constructed between 1785 and 1789. 
        It used a one-ton, 48-inch, or 1.2-meter, diameter speculum-alloy primary spherical mirror 
        with a focal length of 40 feet, or about 12 meters. Because speculum alloy had relatively low reflectivity, 
        Herschel decided not to use a diagonal secondary mirror to avoid additional light loss 
        from another reflection and also obstruction. 
        Instead, the primary mirror was tilted by about 2 degrees so that the image could be viewed directly 
        near the edge of the incoming beam.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/early%20telescopes.htm"
        aria-label="Chapter 14.1 of telescope-optics.net"
      >
        Chapter 14.1 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Mike I. Jones's Improved Herschel Reflector": (
    <>
      <DescriptionParagraph>
        A modernized version of Herschel’s 40-foot reflector has been proposed by Mike I. Jones. 
        The design uses an Ed Jones–type corrector, which consists of a pair of tilted lenses 
        to correct the aberrations from the tilted primary parabolic mirror.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/early%20telescopes.htm"
        aria-label="Chapter 14.1 of telescope-optics.net"
      >
        Chapter 14.1 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Tilted Houghton-Herschel 150mm f/8": (
    <>
      <DescriptionParagraph>
        A 150 mm aperture, f/8 Herschelian reflector with a full-aperture Houghton corrector and a tilted element. 
        The tilted element compensates for the aberrations introduced by the tilted primary mirror.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/miscellaneous_optics.htm"
        aria-label="Example 27 in Chapter 11 of telescope-optics.net"
      >
        Example 27 in Chapter 11 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Terry Platt's 318mm f/21 Buchroeder \"Quad-Schiefspiegler\"": (
    <>
      <DescriptionParagraph>
        A 318 mm aperture and operates at f/21 consisting three tilted mirrors (one aspherized and two spherical) 
        and a flat mirror for two selectable fold positions. 
        The primary mirror is aspherized with a conic constant of −0.55 to minimize axial aberration. 
        The primary and secondary mirrors are arranged to cancel out the coma. 
        The tertiary mirror is used to correct astigmatism.
        The fourth mirror does not affect the ray tracing; therefore, it is omitted from the optical prescription.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/ATM_telescopes.htm"
        aria-label="Chapter 14.2 of telescope-optics.net"
      >
        Chapter 14.2 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Clyde Bone Jr. 30-inch f/5 Mersenne": (
        <>
      <DescriptionParagraph>
        Designed and built by Clyde M. Bone Jr. (1928–2012).
        The system consists of a concave parabolic primary mirror and a convex parabolic secondary mirror arranged confocally. 
        The primary mirror collects the incoming light, and the secondary mirror converts the converging beam into a collimated beam.
        The collimated beam is then redirected by two diagonal flat mirrors into a 140 mm aperture f/5 Petzval APO refractor.
        This folded optical path allows the observer to view comfortably from a seated position, regardless of where the telescope is pointed in the sky.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/ATM_telescopes.htm"
        aria-label="Chapter 14.2 of telescope-optics.net"
      >
        Chapter 14.2 of telescope-optics.net
      </DescriptionExternalLink>
      <DescriptionParagraph>
        An article provides more details about the legacy of this telescope in the amateur astronomy community:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://televue.com/televueopticstalk/2019/07/11/clyde-bone-and-his-two-unusual-mersenne-telescopes/"
        aria-label="Clyde Bone and His Two Unusual Mersenne Telescopes on TeleVue website"
      >
        &quot;Clyde Bone and His Two Unusual Mersenne Telescopes&quot; on TeleVue website
      </DescriptionExternalLink>
    </>
  ),
  "Schmidt Camera 200mm f/5": (
    <>
      <DescriptionParagraph>
        A 200 mm aperture Schmidt camera operating at f/5. 
        The inner surface of its Schmidt corrector plate includes non-zero fourth-, sixth-, and eighth-order aspheric coefficients. 
        These terms are used to correct both low-order and higher-order spherical aberrations.
        To understand the role of the corrector, remove the aspheric terms from the inner surface and then refocus the telescope. 
        The new system will show how severe the aberrations become when the Schmidt correction is absent.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/schmidt_camera_aberrations.htm"
        aria-label="Chapter 10.2.2.1 of telescope-optics.net"
      >
        Chapter 10.2.2.1 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Ortho-APO 130mm f/7.7": (
    <>
      <DescriptionParagraph>
        A 130 mm aperture, f/7.7 triplet Ortho-Apo objective. It uses a PNP, or positive-negative-positive, 
        air-spaced triplet configuration consisting of two positive S-FPL53 elements and one negative S-BSL7 element.
        All optical surfaces in the design are spherical.
      </DescriptionParagraph>
      <DescriptionParagraph>
        A notable feature of this design is the unusually wide air gap between the first and second elements. 
        Such a wide inter-element spacing is uncommon in triplet refractors aimed at amateur astronomers, 
        where more compact air-spaced configurations are typically preferred. 
        In this design, the wide air gap practically eliminates spherochromatism.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/commercial_telescopes.htm"
        aria-label="Example 57 in Chapter 14.4 of telescope-optics.net"
      >
        Example 57 in Chapter 14.4 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Fluorite Doublet APO 130mm f/8 w/ Wide Air Gap & Aspherized Surface": (
    <>
      <DescriptionParagraph>
        A 130 mm f/8 fluorite apochromatic doublet is a demanding optical system 
        because the aperture is large enough, and the focal ratio fast enough, 
        that residual chromatic and spherical aberrations can no longer be treated as small errors. 
        In a conventional amateur-class doublet APO using spherical surfaces and a narrow air gap, 
        it is impossible, even with a fluorite element with another best mate glass element, 
        to maintain a Strehl ratio above 0.95 across most of the visible spectrum at this aperture and f-number.
      </DescriptionParagraph>
      <DescriptionParagraph>
        In this design, the wide air gap allows colors to be brought much closer together than 
        would be possible in a tightly spaced spherical doublet of the same aperture and focal ratio.
      </DescriptionParagraph>
      <DescriptionParagraph>
        However, the wide air gap alone is not sufficient to achieve this level of performance in a 130 mm f/8 doublet. 
        The front surface is made aspheric, with significant higher-order terms. 
        In particular, non-zero fourth-, sixth-, and eighth-order aspheric coefficients are used to control the 
        secondary and tertiary spherical aberrations that would otherwise remain unacceptably large.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://telescope-optics.net/commercial_telescopes.htm"
        aria-label="Example 27 in Chapter 14.4 of telescope-optics.net"
      >
        Example 27 in Chapter 14.4 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Fraunhofer Achromat 120mm f/23.6 (CA ratio = 5)": (
    <>
      <DescriptionParagraph>
        A 120 mm f/23.6 Fraunhofer achromat is a long-focus two-element refracting objective 
        designed to bring two widely separated visible wavelengths to a common focus. 
        In this design, the primary design wavelength is the Fraunhofer e-line at 546 nm, which lies in the green part of the spectrum 
        and is close to the peak sensitivity of the photopic human eye.
      </DescriptionParagraph>
      <DescriptionParagraph>
        The objective satisfies the Conrady criterion, with a chromatic aberration ratio of 5. 
        In practical visual astronomy, this level of correction is often regarded as producing minimal, 
        or effectively negligible, visible chromatic aberration.
      </DescriptionParagraph>
      <DescriptionParagraph>
        However, satisfying the Conrady criterion does not mean that every visible wavelength is 
        simultaneously diffraction limited at a single fixed focus. 
        The lens is best corrected at its design wavelength, 546 nm, 
        where spherical aberration and other monochromatic errors are nulled. 
        If the telescope is focused at the e-line and the focus is not adjusted for other wavelengths, 
        the red C-line at 656 nm and the blue F-line at 486 nm fall at different axial positions 
        because of residual longitudinal chromatism.
      </DescriptionParagraph>
      <DescriptionParagraph>
        As a result, the wavefronts at the C and F lines are dominated by defocus rather than 
        by intrinsic monochromatic aberrations of the lens. 
        When evaluated at the fixed e-line focal plane, the peak-to-valley wavefront error 
        for both the C-line and F-line exceeds about one-half wave. 
        These wavelengths are therefore not diffraction limited at that same focus, 
        even though the system is well corrected at the design wavelength.
      </DescriptionParagraph>
      <DescriptionParagraph>
        In visual use, this does not necessarily imply poor performance, because 
        the human eye is most sensitive near green wavelengths and less sensitive in the 
        deep red and blue.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://www.telescope-optics.net/achromats.htm"
        aria-label="Chapter 9.1 of telescope-optics.net"
      >
        Chapter 9.1 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Fraunhofer Achromat 120mm f/7.5 (CA ratio = 1.59)": (
    <>
      <DescriptionParagraph>
        A Fraunhofer achromat with a 120 mm aperture and an f/7.5 focal ratio. 
        The design wavelength is 546 nm, corresponding to the Fraunhofer e-line in the green part of the spectrum.
      </DescriptionParagraph>
      <DescriptionParagraph>
        On amateur astronomy forums, one occasionally encounters the suggestion that an achromatic refractor 
        can be used for general astrophotography by refocusing the telescope for each colour of interest. 
        The reasoning is that, if each wavelength is brought to best focus individually, the 
        longitudinal chromatic defocus error should be removed. 
        This idea is partly correct: refocusing can compensate for the shift of best focus with wavelength. 
        However, it does not remove all aberrations.
      </DescriptionParagraph>
      <DescriptionParagraph>
        Even after refocusing, the system still exhibits spherochromatism. 
        Spherochromatism is the variation of spherical aberration with wavelength. 
        In other words, the focus position may be adjusted for a given colour, 
        but the wavefront shape at that wavelength may still be imperfect because 
        marginal and paraxial rays do not come to the same focus.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This effect is particularly significant in the blue. For this telescope, 
        when it is focused at 486 nm, corresponding to the Fraunhofer F-line, 
        the longitudinal defocus error is essentially removed. 
        Nevertheless, the system still has a peak-to-valley wavefront error of about 
        0.6 waves due to spherical aberration. 
        This is a large enough error to noticeably reduce the concentration of energy 
        in the diffraction core and spread light into the surrounding halo.
      </DescriptionParagraph>
      <DescriptionParagraph>
        Therefore, using narrowband filters and refocusing separately at each wavelength 
        does not make the achromat equivalent to an apochromat. The blue channel remains 
        degraded by spherical aberration even when it is properly focused. 
        In practical astrophotography, this residual spherochromatism can appear as 
        enlarged blue star images, commonly described as “blue bloat.” 
        Unless corrected optically or reduced by post-processing, 
        this effect will remain visible in the final image.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://www.telescope-optics.net/achromats.htm"
        aria-label="Chapter 9.1 of telescope-optics.net"
      >
        Chapter 9.1 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "APO Doublet (S-FPL53/N-ZK7) 120mm f/7.5": (
    <>
      <DescriptionParagraph>
        A 120 mm aperture, f/7.5 apochromatic doublet refractor, nulled at the 546 nm Fraunhofer e-line. 
        The objective uses an S-FPL53 extra-low-dispersion crown element paired with N-ZK7, a short-flint mating glass. 
        The design is an air-spaced doublet with a narrow air gap, and all refracting surfaces are spherical, 
        making the system relatively practical to manufacture compared with designs requiring aspheric surfaces.
      </DescriptionParagraph>
      <DescriptionParagraph>
        A common question on amateur astronomy forums is whether a two-element refractor can truly be apochromatic, 
        since many observers associate apochromatic correction with triplets. 
        This design shows that a carefully chosen glass pairing can allow a doublet to 
        meet demanding apochromatic performance criteria. 
      </DescriptionParagraph>
      <DescriptionParagraph>
        The system demonstrates that Thomas M. Back’s apochromatic criteria are achievable in a doublet refractor 
        of this class. At the 546 nm e-line, the peak-to-valley optical path difference wavefront error 
        is better than 1/8 wave, indicating strong correction near the visual photopic peak. 
        At the Fraunhofer C-line, 656 nm, and F-line, 486 nm, the peak-to-valley OPD wavefront error remains 
        better than 1/4 wave, which is generally regarded as diffraction-limited performance. 
        Even at the violet g-line, 436 nm, the peak-to-valley OPD wavefront error is better than 1/2 wave, 
        which is notable for a doublet refractor because the blue-violet region is usually where 
        spherochromatism become most apparent.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://www.telescope-optics.net/commercial_telescopes.htm"
        aria-label="Example 19 in Chapter 14.4 of telescope-optics.net"
      >
        Example 19 in Chapter 14.4 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "APO Petzval 140mm f/7": (
    <>
      <DescriptionParagraph>
        The design is a Petzval refractor configuration, 
        consisting of a front doublet objective group and a rear doublet correcting group. 
        Unlike a conventional doublet or triplet refractor, a Petzval system is designed not only to reduce 
        chromatic aberration or spherochromatism but also to produce a flat field. 
        This makes it especially suitable for astrophotography without the need for 
        additional field flattening optics.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://www.telescope-optics.net/miscellaneous_optics.htm"
        aria-label="Example 24 in Chapter 11 of telescope-optics.net"
      >
        Example 24 in Chapter 11 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "APO Petzval 140mm f/7 (but with rear lenses removed)": (
    <>
      <DescriptionParagraph>
        A 140 mm aperture, f/7 Petzval apochromatic refractor design with its rear lens group removed. 
        In its original configuration, the telescope is a well-corrected four-element Petzval APO system, 
        in which the front and rear lens groups work together to control spherochromatism, field curvature, astigmatism, 
        and other aberrations.
      </DescriptionParagraph>
      <DescriptionParagraph>
        There have been occasional discussions on amateur astronomy forums about removing the rear lens group from 
        a Petzval refractor in order to turn it into a slower telescope. 
        The reasoning is usually that, once the rear group is removed, 
        the remaining front objective operates at a longer effective focal length and therefore a higher f-number. 
        There has also been a misleading claim that the rear group in such a telescope is merely a reducer-flattener, 
        similar to an accessory field corrector placed behind an otherwise complete objective.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This example shows why that interpretation is incorrect. After the rear lens group is removed, 
        the system does become much slower, with an effective focal ratio of approximately f/13. 
        However, the optical performance is severely degraded. The on-axis wavefront is no longer well corrected, 
        and the system exhibits strong spherochromatism. In particular, the OPD for the e-line shows 
        a peak-to-valley wavefront error greater than one quarter wave, even though the resulting focal ratio is quite slow.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This result is significant because a conventional FPL-53 doublet working at around f/13 would 
        normally be expected to give essentially perfect on-axis performance. 
        The poor result here therefore cannot be explained simply by the system being “too fast.” 
        Instead, it shows that the front group of this Petzval APO was not designed to function as a complete, 
        independently corrected objective. Its residual aberrations were intended to be balanced by the rear group.
      </DescriptionParagraph>
      <DescriptionParagraph>
        The rear lens group in a Petzval refractor is therefore not just a generic reducer or field flattener. 
        It is an integral part of the optical prescription. 
        In a well-designed Petzval APO, both lens groups participate in the correction of the system as a whole. 
        Removing the rear group changes not only the focal length and field curvature, but also the aberration balance of the telescope. 
        The result can be a slower system that is nevertheless much worse optically, 
        including on-axis, because the original Petzval design requires both groups to work together to minimize aberrations.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is derived from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://www.telescope-optics.net/miscellaneous_optics.htm"
        aria-label="Example 24 in Chapter 11 of telescope-optics.net"
      >
        Example 24 in Chapter 11 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),

  "Flatfield Quadruplet APO 86mm f/7 (Triplet with Singlet Meniscus Lens)": (
    <>
      <DescriptionParagraph>
        An 86 mm aperture, f/7 flat-field quadruplet apochromat designed for imaging over a corrected field. 
        Although it has four elements and it produce a flat field, it should not be described as a Petzval objective. 
        Instead, the design consists of an air-spaced triplet objective followed by a rear meniscus singlet 
        that participates directly in the correction of the system.
      </DescriptionParagraph>
      <DescriptionParagraph>
        The front objective group is a positive-negative-positive triplet. 
        Its two positive elements are made from S-FPL51, while the negative element is made from H-ZK3. 
      </DescriptionParagraph>
      <DescriptionParagraph>
        The rear element is a meniscus singlet with negative optical power. 
        The complete quadruplet has a longer effective focal length and therefore a slower focal ratio 
        than the base triplet alone.
      </DescriptionParagraph>
      <DescriptionParagraph>
        The front triplet and rear meniscus are a coupled optical design, so
        the two groups are not independently corrected subassemblies.
        If the rear meniscus is removed, the remaining triplet will not behave as a well-corrected standalone objective.
      </DescriptionParagraph>
    </>
  ),

  "Reversed Tracing of Modified Imaizumi M. 80deg AFoV Eyepiece US#5,557,464 (1996)": (
    <>
      <DescriptionParagraph>
        A modified version of Imaizumi M.’s patented 80° apparent-field-of-view eyepiece, 
        based on a five-element Erfle configuration combined with a two-element Smyth lens group, 
        as described in U.S. Patent No. 5,557,464 from 1996. 
      </DescriptionParagraph>
      <DescriptionParagraph>
        This example is useful for demonstrating how backward ray tracing is performed through an eyepiece. 
        Because an eyepiece is normally used as an afocal system, rays are often traced backward from the eye side 
        toward the objective side. In this approach, the exit pupil of the complete afocal system is treated as 
        the entrance pupil for the backward trace. Rays are launched from the eye point through the eyepiece and are 
        traced backward until they reach the intermediate focal region that would normally be formed by the telescope objective.
      </DescriptionParagraph>
      <DescriptionParagraph>
        To model the objective f-number during backward tracing, the entrance pupil diameter, EPD, 
        used in the backward model should be chosen so that it corresponds to the desired exit pupil diameter of 
        the afocal telescope-eyepiece system. For an eyepiece of paraxial focal length <MathJax inline>{`\\(f_{ep}\\)`}</MathJax>, 
        used with an objective of f-number <MathJax inline>{`\\(F_{\\#}\\)`}</MathJax>, 
        the EPD is approximately <MathJax inline>{`\\(\\frac{f_{ep}}{F_{\\#}}\\)`}</MathJax>.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is derived from:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://www.telescope-optics.net/eyepiece_raytrace.htm"
        aria-label="Chapter 12.4 of telescope-optics.net"
      >
        Chapter 12.4 of telescope-optics.net
      </DescriptionExternalLink>
    </>
  ),
  "Fisheye Lens Example": (
    <>
      <DescriptionParagraph>
        A small fisheye lens with a field of view of ±90°, corresponding to a full angular field of 180°. 
        In this type of optical system, rays from the edge of the field enter the lens at very large angles 
        relative to the optical axis, so the assumptions used in paraxial, first-order analysis are no longer valid.
        For such a large field of view, even third-order aberration theory becomes invalid.
      </DescriptionParagraph>
      <DescriptionParagraph>
        Because of these extreme ray angles, the wide angle mode should therefore be enabled so that a more robust 
        chief-ray aiming algorithm is used.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from a RayOptics GitHub discussion:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://redirect.github.com/mjhoptics/ray-optics/discussions/157#discussioncomment-11589178"
        aria-label="RayOptics GitHub discussion source for the fisheye lens example"
      >
        Link
      </DescriptionExternalLink>
    </>
  ),
  "Cell Phone Camera Lens Example US#7,535,658": (
    <>
      <DescriptionParagraph>
        A cell phone camera with an f-number of 3.5, described in U.S. Patent No. 7,535,658.
      </DescriptionParagraph>
      <DescriptionParagraph>
        Many of the surfaces in this type of design are highly aspheric and are described using high-order radial polynomial terms. 
        The surface sag includes polynomial coefficients from third-order up to tenth-order, 
        allowing the designer to correct aberrations that would otherwise be difficult to control in such a compact system. 
      </DescriptionParagraph>
      <DescriptionParagraph>
        The design may use several different types of model glass. In this simplified representation, 
        each glass is defined only by its refractive index at the Fraunhofer d-line and by its Abbe number. 
        This means that the material dispersion is not described by a full Sellmeier or Schott dispersion formula, 
        but by a reduced model that captures the basic refractive power and chromatic behavior of each material. 
        Such a model is often sufficient for demonstrating first-order color correction and 
        for studying the role of material choice in compact lens design.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This system is also a representative example of an optical design using radial polynomial surfaces. 
        Instead of describing each surface as a conic alone,
        the surface profile is modified by additional higher-order radial terms.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from a RayOptics documentation:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://ray-optics.readthedocs.io/en/stable/examples/Cell_Phone_lens/Cell_Phone_lens.html"
        aria-label="RayOptics documentation source for the cell phone camera lens example"
      >
        Link
      </DescriptionExternalLink>
    </>
  ),
  "Diffraction Grating (Transmissive) Example": (
    <>
      <DescriptionParagraph>
        A simple spectrometer consisting of a doublet collimator lens, 
        a transmissive diffraction grating, and a doublet focusing lens.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from a RayOptics GitHub discussion:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://redirect.github.com/mjhoptics/ray-optics/discussions/156#discussioncomment-10790331"
        aria-label="RayOptics GitHub discussion source for the transmissive diffraction grating example"
      >
        Link
      </DescriptionExternalLink>
    </>
  ),
  "Diffraction Grating (Reflective) Example": (
    <>
      <DescriptionParagraph>
        A simple spectrometer consisting of a singlet collimator lens, 
        and a reflective diffraction grating.
      </DescriptionParagraph>
      <DescriptionParagraph>
        This prescription is from a RayOptics GitHub discussion:
      </DescriptionParagraph>
      <DescriptionExternalLink
        href="https://redirect.github.com/mjhoptics/ray-optics/discussions/147#discussioncomment-9360602"
        aria-label="RayOptics GitHub discussion source for the reflective diffraction grating example"
      >
        Link
      </DescriptionExternalLink>
    </>
  ),
};

export function stripExamplePrefix(name: string): string {
  return name.replace(/^\d+:\s*/, "");
}

export function getExampleSystemDescription(exampleKey: string): ReactNode {
  const name = stripExamplePrefix(exampleKey);
  return DESCRIPTIONS_BY_NAME[name] ?? "Bundled example optical system.";
}

import Carousel from 'react-bootstrap/Carousel';

const HomeCarousel = () => {
  return (
    <div className="container-fluid p-0">
      <Carousel>
        <Carousel.Item>
          <img
            className="banner-img"
            src="/images/img-book-of-year.jpeg"
            alt="Primer slide"
          />
        </Carousel.Item>

        <Carousel.Item>
          <img
            className="banner-img"
            src="/images/img-new-releases.jpeg"
            alt="Segundo slide"
          />
        </Carousel.Item>
      </Carousel>
    </div>
  );
};

export default HomeCarousel;

import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const AuthorLink = ({ authorName, authorId: _authorId, username, className = '' }) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.stopPropagation(); 
    if (username) {
      navigate(`/user/${username}`);
    }
  };

  return (
    <span
      className={`author-link ${className}`}
      onClick={handleClick}
      style={{ cursor: username ? 'pointer' : 'default' }}
    >
      {authorName || 'Anonymous'}
    </span>
  );
};

AuthorLink.propTypes = {
  authorName: PropTypes.string,
  authorId: PropTypes.string,
  username: PropTypes.string,
  className: PropTypes.string
};

export default AuthorLink;

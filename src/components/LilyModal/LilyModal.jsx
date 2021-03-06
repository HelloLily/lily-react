import React from 'react';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const LilyModal = ({ modalOpen, closeModal, children }) => (
  <Modal
    isOpen={modalOpen}
    onRequestClose={closeModal}
    className="lily-modal zoom-in"
    overlayClassName="modal-overlay"
    parentSelector={() => document.querySelector('#app')}
    ariaHideApp={false}
  >
    <button onClick={closeModal} className="hl-interface-btn close-btn">
      <FontAwesomeIcon icon={['far', 'times']} size="lg" />
    </button>

    {children}
  </Modal>
);

export default LilyModal;

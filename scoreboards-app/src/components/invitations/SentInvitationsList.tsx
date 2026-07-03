import React, { useMemo, useState } from 'react';
import type { Invitation } from '../../types/Invitation.ts';
import { DataTable } from '../common/table/DataTable.tsx';
import { useDateFormat } from '../../utils/Utils.ts';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { InvitationService } from '../../services/InvitationService.ts';

type SentInvitationsListProps = {
  invitations: Invitation[];
  onDeleteInvitation: (invitationId: string) => void;
  isLoading?: boolean;
};

export const SentInvitationsList: React.FC<SentInvitationsListProps> = ({
  invitations,
  onDeleteInvitation,
  isLoading = false,
}) => {
  const { format_date } = useDateFormat();
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();
  const [deleteInvitationDialogOpen, setDeleteInvitationDialogOpen] =
    useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<Invitation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openDeleteInvitationModal = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setDeleteInvitationDialogOpen(true);
  };

  const handleDeleteInvitationConfirm = async () => {
    if (!selectedInvitation) return;

    setIsProcessing(true);
    try {
      await InvitationService.deleteInvitation(selectedInvitation.id);
      onDeleteInvitation(selectedInvitation.id);
      showSuccessMessage('Invitation deleted');
    } catch (err) {
      showErrorMessage('Failed to delete invitation');
    } finally {
      setDeleteInvitationDialogOpen(false);
      setSelectedInvitation(null);
      setIsProcessing(false);
    }
  };

  const data = useMemo(
    () =>
      invitations.map((invitation) => ({
        id: invitation.id,
        Receiver: invitation.receiverName,
        'Date Sent': format_date(invitation.created),
        invitation,
      })),
    [invitations]
  );

  return (
    <>
      <ConfirmDialog
        open={deleteInvitationDialogOpen}
        onCancel={() => setDeleteInvitationDialogOpen(false)}
        title="Delete Invitation"
        text={`Are you sure you want to delete the invitation to ${selectedInvitation?.receiverName}?`}
        confirmLabel="Delete"
        loading={isProcessing}
        onConfirm={handleDeleteInvitationConfirm}
      />
      <DataTable
        title={'Sent Invitations'}
        headers={['Receiver', 'Date Sent']}
        data={data}
        pageSize={10}
        onDelete={(row) => openDeleteInvitationModal(row.invitation)}
        canDelete={!isProcessing}
        isLoading={isLoading}
      />
    </>
  );
};

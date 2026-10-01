
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Search,
  User,
  Phone,
  Mail,
  Wallet,
  CreditCard,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowLeft,
  DollarSign,
  RefreshCw,
  History,
  Banknote,
  Loader2,
  ChevronRight,
} from 'lucide-react';

import toast from 'react-hot-toast';

import api from '../../api/client';


/**
 * =========================================================
 * Helpers
 * =========================================================
 */

const fmt = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};


const formatDate = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );
};


const formatDateTime = (date) => {
  if (!date) return '-';

  return new Date(date).toLocaleString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
};


/**
 * =========================================================
 * Loan status
 * =========================================================
 */

const loanStatusConfig = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className:
      'bg-amber-50 text-amber-700 border-amber-200',
  },

  PARTIALLY_PAID: {
    label: 'Partially Paid',
    icon: DollarSign,
    className:
      'bg-blue-50 text-blue-700 border-blue-200',
  },

  PAID: {
    label: 'Paid',
    icon: CheckCircle2,
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
  },

  OVERDUE: {
    label: 'Overdue',
    icon: AlertCircle,
    className:
      'bg-rose-50 text-rose-700 border-rose-200',
  },

  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    className:
      'bg-gray-100 text-gray-600 border-gray-200',
  },
};


/**
 * =========================================================
 * Component
 * =========================================================
 */

export default function CustomerCredit() {
  /**
   * -------------------------------------------------------
   * Customer state
   * -------------------------------------------------------
   */

  const [customers, setCustomers] =
    useState([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [customerData, setCustomerData] =
    useState(null);

  const [search, setSearch] =
    useState('');

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [loadingCustomerLoans, setLoadingCustomerLoans] =
    useState(false);

  /**
   * -------------------------------------------------------
   * Payment methods
   * -------------------------------------------------------
   */

  const [paymentMethods, setPaymentMethods] =
    useState([]);

  const [loadingPaymentMethods, setLoadingPaymentMethods] =
    useState(false);

  /**
   * -------------------------------------------------------
   * Pay debt modal
   * -------------------------------------------------------
   */

  const [showPayModal, setShowPayModal] =
    useState(false);

  const [payAmount, setPayAmount] =
    useState('');

  const [payMethod, setPayMethod] =
    useState('');

  const [paymentReference, setPaymentReference] =
    useState('');

  const [paymentNotes, setPaymentNotes] =
    useState('');

  const [paying, setPaying] =
    useState(false);


  /**
   * =========================================================
   * Load customers
   * =========================================================
   */

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);

      const data = await api.get('/customers');

      setCustomers(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        'Failed to load customers:',
        error
      );

      toast.error(
        error?.error ||
        error?.message ||
        'Failed to load customers'
      );
    } finally {
      setLoadingCustomers(false);
    }
  };


  /**
   * =========================================================
   * Load customer loans
   * =========================================================
   */

  const loadCustomerLoans = async (
    customerId,
    showLoading = true
  ) => {
    try {
      if (showLoading) {
        setLoadingCustomerLoans(true);
      }

      const data = await api.get(
        `/loans/customer/${customerId}`
      );

      setCustomerData(data);

      /**
       * Also update the customer in the
       * customer list with the newest balance.
       */
      if (data?.customer) {
        setCustomers((current) =>
          current.map((customer) =>
            customer.id === customerId
              ? {
                  ...customer,
                  ...data.customer,
                }
              : customer
          )
        );

        setSelectedCustomer((current) =>
          current?.id === customerId
            ? {
                ...current,
                ...data.customer,
              }
            : current
        );
      }

      return data;
    } catch (error) {
      console.error(
        'Failed to load customer loans:',
        error
      );

      toast.error(
        error?.error ||
        error?.message ||
        'Failed to load customer loans'
      );
    } finally {
      if (showLoading) {
        setLoadingCustomerLoans(false);
      }
    }
  };


  /**
   * =========================================================
   * Load payment methods
   * =========================================================
   */

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);

      const data =
        await api.get('/payment-methods');

      const enabledMethods =
        (Array.isArray(data)
          ? data
          : []
        ).filter(
          (method) =>
            method.isEnabled
        );

      setPaymentMethods(
        enabledMethods
      );

      /**
       * Select first available method.
       */
      if (
        enabledMethods.length > 0 &&
        !payMethod
      ) {
        setPayMethod(
          enabledMethods[0].name
        );
      }
    } catch (error) {
      console.error(
        'Failed to load payment methods:',
        error
      );

      toast.error(
        error?.error ||
        error?.message ||
        'Failed to load payment methods'
      );
    } finally {
      setLoadingPaymentMethods(false);
    }
  };


  /**
   * =========================================================
   * Initial loading
   * =========================================================
   */

  useEffect(() => {
    loadCustomers();
    loadPaymentMethods();
  }, []);


  /**
   * =========================================================
   * Select customer
   * =========================================================
   */

  const handleSelectCustomer = async (
    customer
  ) => {
    setSelectedCustomer(customer);

    await loadCustomerLoans(
      customer.id
    );
  };


  /**
   * =========================================================
   * Back to customer list
   * =========================================================
   */

  const handleBack = () => {
    setSelectedCustomer(null);
    setCustomerData(null);
  };


  /**
   * =========================================================
   * Refresh
   * =========================================================
   */

  const handleRefresh = async () => {
    await loadCustomers();

    if (selectedCustomer) {
      await loadCustomerLoans(
        selectedCustomer.id,
        false
      );
    }
  };


  /**
   * =========================================================
   * Open Pay Debt modal
   * =========================================================
   */

  const openPayModal = () => {
    if (!selectedCustomer) {
      return;
    }

    const balance =
      Number(
        customerData?.summary
          ?.totalOutstanding ||
        selectedCustomer.outstandingBalance ||
        0
      );

    if (balance <= 0) {
      toast.error(
        'This customer has no outstanding balance'
      );

      return;
    }

    setPayAmount(
      balance.toFixed(2)
    );

    setPaymentReference('');
    setPaymentNotes('');

    /**
     * Make sure a payment method
     * is selected.
     */
    if (
      paymentMethods.length > 0 &&
      !payMethod
    ) {
      setPayMethod(
        paymentMethods[0].name
      );
    }

    setShowPayModal(true);
  };


  /**
   * =========================================================
   * Close Pay Debt modal
   * =========================================================
   */

  const closePayModal = () => {
    if (paying) return;

    setShowPayModal(false);
    setPayAmount('');
    setPaymentReference('');
    setPaymentNotes('');
  };


  /**
   * =========================================================
   * Pay Debt
   * =========================================================
   */

  const handlePayDebt = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedCustomer) {
      return;
    }

    const amount =
      Number(payAmount);

    const outstanding =
      Number(
        customerData?.summary
          ?.totalOutstanding ||
        selectedCustomer.outstandingBalance ||
        0
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error(
        'Enter a valid payment amount'
      );

      return;
    }

    if (amount > outstanding + 0.01) {
      toast.error(
        `Payment cannot exceed the outstanding balance of ${fmt(
          outstanding
        )}`
      );

      return;
    }

    if (!payMethod) {
      toast.error(
        'Please select a payment method'
      );

      return;
    }

    try {
      setPaying(true);

      const result =
        await api.post(
          `/loans/customer/${selectedCustomer.id}/pay`,
          {
            amount,
            paymentMethod:
              payMethod,
            paymentReference:
              paymentReference.trim() ||
              null,
            notes:
              paymentNotes.trim() ||
              null,
          }
        );

      toast.success(
        `Payment of ${fmt(amount)} recorded successfully`
      );

      /**
       * Close modal.
       */
      setShowPayModal(false);

      /**
       * Clear fields.
       */
      setPayAmount('');
      setPaymentReference('');
      setPaymentNotes('');

      /**
       * Refresh customer and loan
       * data from backend.
       */
      await loadCustomers();

      await loadCustomerLoans(
        selectedCustomer.id,
        false
      );
    } catch (error) {
      console.error(
        'Failed to pay customer debt:',
        error
      );

      toast.error(
        error?.error ||
        error?.message ||
        'Failed to record payment'
      );
    } finally {
      setPaying(false);
    }
  };


  /**
   * =========================================================
   * Filter customers
   * =========================================================
   *
   * Backend already supports search, but
   * filtering here also makes the page
   * responsive while the full list is loaded.
   */

  const filteredCustomers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return customers;
      }

      return customers.filter(
        (customer) =>
          customer.name
            ?.toLowerCase()
            .includes(query) ||
          customer.email
            ?.toLowerCase()
            .includes(query) ||
          customer.phone
            ?.toLowerCase()
            .includes(query)
      );
    }, [
      customers,
      search,
    ]);


  /**
   * =========================================================
   * Selected customer information
   * =========================================================
   */

  const outstanding =
    Number(
      customerData?.summary
        ?.totalOutstanding ||
      selectedCustomer?.outstandingBalance ||
      0
    );

  const totalBorrowed =
    Number(
      customerData?.summary
        ?.totalBorrowed ||
      0
    );

  const totalPaid =
    Number(
      customerData?.summary
        ?.totalPaid ||
      0
    );

  const openLoans =
    Number(
      customerData?.summary
        ?.openLoans ||
      0
    );

  const loans =
    customerData?.loans ||
    [];


  /**
   * =========================================================
   * Render
   * =========================================================
   */

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Credit
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage customer loans, balances,
              and debt payments
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={
              loadingCustomers ||
              loadingCustomerLoans
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loadingCustomers ||
                loadingCustomerLoans
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>


        {/* =================================================
            CUSTOMER LIST
        ================================================= */}

        {!selectedCustomer && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

            {/* Search */}

            <div className="border-b border-gray-100 p-4">
              <div className="relative max-w-md">

                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search customer..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
                />

              </div>
            </div>


            {/* Customer table */}

            {loadingCustomers ? (
              <div className="flex min-h-[300px] items-center justify-center">

                <Loader2
                  size={30}
                  className="animate-spin text-gray-400"
                />

              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

                <User
                  size={42}
                  className="mb-3 text-gray-300"
                />

                <h3 className="font-semibold text-gray-700">
                  No customers found
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Try another search.
                </p>

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[700px]">

                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">

                      <th className="px-5 py-3">
                        Customer
                      </th>

                      <th className="px-5 py-3">
                        Phone
                      </th>

                      <th className="px-5 py-3 text-right">
                        Outstanding
                      </th>

                      <th className="px-5 py-3 text-right">
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {filteredCustomers.map(
                      (customer) => {
                        const balance =
                          Number(
                            customer.outstandingBalance ||
                            0
                          );

                        return (
                          <tr
                            key={customer.id}
                            onClick={() =>
                              handleSelectCustomer(
                                customer
                              )
                            }
                            className="cursor-pointer transition hover:bg-gray-50"
                          >

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                  <User
                                    size={18}
                                  />
                                </div>

                                <div>
                                  <p className="font-medium text-gray-900">
                                    {customer.name}
                                  </p>

                                  {customer.email && (
                                    <p className="text-xs text-gray-400">
                                      {customer.email}
                                    </p>
                                  )}
                                </div>

                              </div>

                            </td>


                            <td className="px-5 py-4 text-sm text-gray-600">
                              {customer.phone ||
                                '-'}
                            </td>


                            <td className="px-5 py-4 text-right">

                              <span
                                className={
                                  balance > 0
                                    ? 'font-bold text-rose-600'
                                    : 'font-medium text-emerald-600'
                                }
                              >
                                {fmt(balance)}
                              </span>

                            </td>


                            <td className="px-5 py-4 text-right">

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  handleSelectCustomer(
                                    customer
                                  );
                                }}
                                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                              >
                                View

                                <ChevronRight
                                  size={16}
                                />
                              </button>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        )}


        {/* =================================================
            CUSTOMER DETAILS
        ================================================= */}

        {selectedCustomer && (
          <div>

            {/* Back */}

            <button
              type="button"
              onClick={handleBack}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              <ArrowLeft
                size={17}
              />

              Back to customers
            </button>


            {loadingCustomerLoans ? (
              <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-white">

                <div className="text-center">

                  <Loader2
                    size={32}
                    className="mx-auto animate-spin text-gray-400"
                  />

                  <p className="mt-3 text-sm text-gray-500">
                    Loading customer credit...
                  </p>

                </div>

              </div>
            ) : (
              <>
                {/* =================================================
                    CUSTOMER HEADER
                ================================================= */}

                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                    <div className="flex items-center gap-4">

                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                        <User
                          size={25}
                        />
                      </div>

                      <div>

                        <h2 className="text-xl font-bold text-gray-900">
                          {customerData?.customer?.name ||
                            selectedCustomer.name}
                        </h2>

                        <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-500">

                          {(
                            customerData?.customer?.phone ||
                            selectedCustomer.phone
                          ) && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone
                                size={14}
                              />

                              {customerData?.customer?.phone ||
                                selectedCustomer.phone}
                            </span>
                          )}

                          {(
                            customerData?.customer?.email ||
                            selectedCustomer.email
                          ) && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail
                                size={14}
                              />

                              {customerData?.customer?.email ||
                                selectedCustomer.email}
                            </span>
                          )}

                        </div>

                      </div>

                    </div>


                    <button
                      type="button"
                      onClick={openPayModal}
                      disabled={
                        outstanding <= 0
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Wallet
                        size={18}
                      />

                      Pay Debt
                    </button>

                  </div>

                </div>


                {/* =================================================
                    SUMMARY CARDS
                ================================================= */}

                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  {/* Outstanding */}

                  <div className="rounded-xl border border-rose-100 bg-white p-5 shadow-sm">

                    <div className="mb-3 flex items-center justify-between">

                      <span className="text-sm font-medium text-gray-500">
                        Outstanding
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                        <Wallet
                          size={18}
                        />
                      </div>

                    </div>

                    <p className="text-2xl font-bold text-rose-600">
                      {fmt(outstanding)}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Current customer debt
                    </p>

                  </div>


                  {/* Borrowed */}

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                    <div className="mb-3 flex items-center justify-between">

                      <span className="text-sm font-medium text-gray-500">
                        Total Borrowed
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                        <DollarSign
                          size={18}
                        />
                      </div>

                    </div>

                    <p className="text-2xl font-bold text-gray-900">
                      {fmt(totalBorrowed)}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Lifetime credit
                    </p>

                  </div>


                  {/* Paid */}

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                    <div className="mb-3 flex items-center justify-between">

                      <span className="text-sm font-medium text-gray-500">
                        Total Paid
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <CheckCircle2
                          size={18}
                        />
                      </div>

                    </div>

                    <p className="text-2xl font-bold text-emerald-600">
                      {fmt(totalPaid)}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Loan payments
                    </p>

                  </div>


                  {/* Open loans */}

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                    <div className="mb-3 flex items-center justify-between">

                      <span className="text-sm font-medium text-gray-500">
                        Open Loans
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText
                          size={18}
                        />
                      </div>

                    </div>

                    <p className="text-2xl font-bold text-gray-900">
                      {openLoans}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Unpaid credit orders
                    </p>

                  </div>

                </div>


                {/* =================================================
                    LOAN HISTORY
                ================================================= */}

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

                  <div className="flex items-center justify-between border-b border-gray-100 p-5">

                    <div>

                      <h3 className="flex items-center gap-2 font-semibold text-gray-900">

                        <History
                          size={18}
                        />

                        Loan History

                      </h3>

                      <p className="mt-1 text-xs text-gray-400">
                        Customer credit and repayment history
                      </p>

                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {loans.length} loans
                    </span>

                  </div>


                  {loans.length === 0 ? (
                    <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">

                      <CheckCircle2
                        size={42}
                        className="mb-3 text-emerald-400"
                      />

                      <h3 className="font-semibold text-gray-700">
                        No loan history
                      </h3>

                      <p className="mt-1 text-sm text-gray-400">
                        This customer has no credit orders.
                      </p>

                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">

                      {loans.map(
                        (loan) => {
                          const status =
                            loanStatusConfig[
                              loan.status
                            ] ||
                            loanStatusConfig.PENDING;

                          const StatusIcon =
                            status.icon;

                          return (
                            <div
                              key={loan.id}
                              className="p-5"
                            >

                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                                {/* Order */}

                                <div className="flex items-start gap-3">

                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                                    <FileText
                                      size={18}
                                    />
                                  </div>

                                  <div>

                                    <p className="font-semibold text-gray-900">
                                      Order #
                                      {loan.order?.orderNumber ||
                                        loan.orderId}
                                    </p>

                                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">

                                      <span className="inline-flex items-center gap-1">
                                        <Calendar
                                          size={12}
                                        />

                                        {formatDate(
                                          loan.createdAt
                                        )}
                                      </span>

                                      {loan.dueDate && (
                                        <span>
                                          Due:{' '}
                                          {formatDate(
                                            loan.dueDate
                                          )}
                                        </span>
                                      )}

                                    </div>

                                  </div>

                                </div>


                                {/* Status */}

                                <span
                                  className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}
                                >

                                  <StatusIcon
                                    size={13}
                                  />

                                  {status.label}

                                </span>


                                {/* Amounts */}

                                <div className="grid grid-cols-3 gap-5 text-right">

                                  <div>
                                    <p className="text-xs text-gray-400">
                                      Original
                                    </p>

                                    <p className="mt-1 font-semibold text-gray-900">
                                      {fmt(
                                        loan.originalAmount
                                      )}
                                    </p>
                                  </div>


                                  <div>
                                    <p className="text-xs text-gray-400">
                                      Paid
                                    </p>

                                    <p className="mt-1 font-semibold text-emerald-600">
                                      {fmt(
                                        loan.paidAmount
                                      )}
                                    </p>
                                  </div>


                                  <div>
                                    <p className="text-xs text-gray-400">
                                      Remaining
                                    </p>

                                    <p className="mt-1 font-bold text-rose-600">
                                      {fmt(
                                        loan.remainingAmount
                                      )}
                                    </p>
                                  </div>

                                </div>

                              </div>


                              {/* Payment history */}

                              {loan.payments?.length >
                                0 && (
                                <div className="mt-4 rounded-lg bg-gray-50 p-4">

                                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Payment History
                                  </p>

                                  <div className="space-y-2">

                                    {loan.payments.map(
                                      (payment) => (
                                        <div
                                          key={
                                            payment.id
                                          }
                                          className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                        >

                                          <div className="flex items-center gap-3">

                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                              <Banknote
                                                size={15}
                                              />
                                            </div>

                                            <div>

                                              <p className="text-sm font-medium text-gray-800">
                                                {payment
                                                  .paymentMethod
                                                  ?.name ||
                                                  'Payment'}
                                              </p>

                                              <p className="text-xs text-gray-400">
                                                {formatDateTime(
                                                  payment.createdAt
                                                )}
                                              </p>

                                            </div>

                                          </div>


                                          <div className="text-left sm:text-right">

                                            <p className="font-semibold text-emerald-600">
                                              +
                                              {fmt(
                                                payment.amount
                                              )}
                                            </p>

                                            {payment.paymentReference && (
                                              <p className="text-xs text-gray-400">
                                                Ref:{' '}
                                                {
                                                  payment.paymentReference
                                                }
                                              </p>
                                            )}

                                          </div>

                                        </div>
                                      )
                                    )}

                                  </div>

                                </div>
                              )}

                            </div>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>

              </>
            )}

          </div>
        )}

      </div>


      {/* =====================================================
          PAY DEBT MODAL
      ===================================================== */}

      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* Modal header */}

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">

              <div>

                <h2 className="font-semibold text-gray-900">
                  Pay Customer Debt
                </h2>

                <p className="mt-0.5 text-xs text-gray-400">
                  {selectedCustomer?.name}
                </p>

              </div>

              <button
                type="button"
                onClick={closePayModal}
                disabled={paying}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
              >
                <XCircle
                  size={20}
                />
              </button>

            </div>


            {/* Modal body */}

            <form
              onSubmit={handlePayDebt}
              className="p-5"
            >

              {/* Outstanding */}

              <div className="mb-5 rounded-xl bg-rose-50 p-4">

                <p className="text-xs font-medium text-rose-500">
                  Outstanding Balance
                </p>

                <p className="mt-1 text-2xl font-bold text-rose-700">
                  {fmt(outstanding)}
                </p>

              </div>


              {/* Amount */}

              <div className="mb-4">

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payment Amount
                </label>

                <div className="relative">

                  <DollarSign
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="number"
                    min="0.01"
                    max={outstanding}
                    step="0.01"
                    value={payAmount}
                    onChange={(event) =>
                      setPayAmount(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    disabled={paying}
                    className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-lg font-semibold outline-none transition focus:border-gray-400 disabled:bg-gray-50"
                  />

                </div>

                <div className="mt-1.5 flex justify-between text-xs text-gray-400">

                  <span>
                    Maximum:
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPayAmount(
                        outstanding.toFixed(
                          2
                        )
                      )
                    }
                    disabled={paying}
                    className="font-medium text-gray-600 hover:underline"
                  >
                    Use full balance
                  </button>

                </div>

              </div>


              {/* Payment method */}

              <div className="mb-4">

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payment Method
                </label>

                {loadingPaymentMethods ? (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-400">

                    <Loader2
                      size={16}
                      className="animate-spin"
                    />

                    Loading payment methods...

                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    No enabled payment methods found.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">

                    {paymentMethods.map(
                      (method) => {
                        const selected =
                          payMethod ===
                          method.name;

                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() =>
                              setPayMethod(
                                method.name
                              )
                            }
                            disabled={paying}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm font-medium transition ${
                              selected
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >

                            {method.name
                              ?.toLowerCase()
                              .includes(
                                'cash'
                              ) ? (
                              <Banknote
                                size={17}
                              />
                            ) : (
                              <CreditCard
                                size={17}
                              />
                            )}

                            <span className="truncate">
                              {method.name}
                            </span>

                          </button>
                        );
                      }
                    )}

                  </div>
                )}

              </div>


              {/* Reference */}

              <div className="mb-4">

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payment Reference
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    paymentReference
                  }
                  onChange={(event) =>
                    setPaymentReference(
                      event.target.value
                    )
                  }
                  placeholder="Receipt number, transaction ID..."
                  disabled={paying}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 disabled:bg-gray-50"
                />

              </div>


              {/* Notes */}

              <div className="mb-6">

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  value={
                    paymentNotes
                  }
                  onChange={(event) =>
                    setPaymentNotes(
                      event.target.value
                    )
                  }
                  placeholder="Add a note..."
                  rows={3}
                  disabled={paying}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 disabled:bg-gray-50"
                />

              </div>


              {/* Buttons */}

              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={closePayModal}
                  disabled={paying}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    paying ||
                    !payMethod ||
                    Number(payAmount) <=
                      0 ||
                    Number(payAmount) >
                      outstanding +
                        0.01
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >

                  {paying ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet
                        size={17}
                      />

                      Pay{' '}
                      {fmt(
                        Number(
                          payAmount
                        )
                      )}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
